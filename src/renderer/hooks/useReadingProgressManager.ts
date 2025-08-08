import { useCallback, useEffect, useRef, useState } from 'react';
import { ReadingProgress, BookMetadata, AppError, ErrorType } from '../../shared/types';
import { useReadingProgress, useError } from '../store/hooks';
import { ipcClient } from '../services/IPCClient';

interface UseReadingProgressManagerOptions {
  book: BookMetadata;
  autoSaveInterval?: number; // 自动保存间隔（毫秒）
  debounceDelay?: number; // 防抖延迟（毫秒）
  enableAutoDetection?: boolean; // 启用自动位置检测
  enableBackup?: boolean; // 启用进度备份
}

interface ReadingProgressManager {
  currentProgress: ReadingProgress | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaveTime: Date | null;
  saveProgress: (progress: Partial<ReadingProgress>) => Promise<void>;
  loadProgress: () => Promise<ReadingProgress | null>;
  resetProgress: () => Promise<void>;
  hasUnsavedChanges: boolean;
  backupProgress: () => Promise<void>;
  restoreProgress: (backupData: ReadingProgress) => Promise<void>;
  getProgressHistory: () => ReadingProgress[];
  detectCurrentPosition: () => string;
  isValidProgress: (progress: ReadingProgress) => boolean;
}

/**
 * 阅读进度管理 Hook
 * 提供自动保存、加载、重置、备份恢复等功能
 */
export const useReadingProgressManager = ({
  book,
  autoSaveInterval = 5000, // 5秒自动保存
  debounceDelay = 1000, // 1秒防抖
  enableAutoDetection = true, // 启用自动位置检测
  enableBackup = true // 启用进度备份
}: UseReadingProgressManagerOptions): ReadingProgressManager => {
  const { readingProgress, setReadingProgress, updateReadingProgress } = useReadingProgress();
  const { createError } = useError();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 防抖定时器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 自动保存定时器
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 待保存的进度数据
  const pendingProgressRef = useRef<Partial<ReadingProgress> | null>(null);
  // 进度历史记录（用于异常恢复）
  const progressHistoryRef = useRef<ReadingProgress[]>([]);
  // 位置检测相关
  const positionDetectionRef = useRef<{
    lastScrollPosition: number;
    lastViewportHeight: number;
    lastContentHeight: number;
  }>({
    lastScrollPosition: 0,
    lastViewportHeight: 0,
    lastContentHeight: 0
  });

  /**
   * 验证进度数据的有效性
   */
  const isValidProgress = useCallback((progress: ReadingProgress): boolean => {
    try {
      // 基本字段验证
      if (!progress.bookId || !progress.position || !progress.lastUpdateTime) {
        return false;
      }

      // 页码范围验证
      if (progress.currentPage < 1 || progress.currentPage > book.totalPages) {
        return false;
      }

      // 百分比验证
      if (progress.percentage < 0 || progress.percentage > 100) {
        return false;
      }

      // 章节索引验证
      if (progress.currentChapter < 0) {
        return false;
      }

      // 时间戳验证
      const updateTime = new Date(progress.lastUpdateTime);
      if (isNaN(updateTime.getTime()) || updateTime > new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Progress validation error:', error);
      return false;
    }
  }, [book.totalPages]);

  /**
   * 加载阅读进度
   */
  const loadProgress = useCallback(async (): Promise<ReadingProgress | null> => {
    if (!book?.id) return null;

    try {
      setIsLoading(true);
      
      // 恢复进度历史记录
      if (enableBackup) {
        progressHistoryRef.current = restoreProgressHistory(book.id);
      }
      
      const progress = await ipcClient.getProgress(book.id);
      
      if (progress) {
        // 验证进度数据的完整性
        if (isValidProgress(progress)) {
          const validatedProgress = validateProgressData(progress, book);
          setReadingProgress(validatedProgress);
          setHasUnsavedChanges(false);
          
          // 备份加载的进度
          if (enableBackup) {
            await backupProgress();
          }
          
          return validatedProgress;
        } else {
          // 进度数据损坏，尝试从历史记录恢复
          console.warn('Corrupted progress data detected, attempting recovery...');
          
          if (enableBackup && progressHistoryRef.current.length > 0) {
            const lastValidProgress = progressHistoryRef.current.find(p => isValidProgress(p));
            if (lastValidProgress) {
              console.log('Restored progress from backup');
              const restoredProgress = validateProgressData(lastValidProgress, book);
              setReadingProgress(restoredProgress);
              // 保存恢复的进度
              await performSave(restoredProgress);
              return restoredProgress;
            }
          }
          
          // 无法恢复，创建新的初始进度
          throw new Error('Progress data is corrupted and cannot be recovered');
        }
      } else {
        // 创建初始进度
        const initialProgress = createInitialProgress(book);
        setReadingProgress(initialProgress);
        return initialProgress;
      }
    } catch (error) {
      createError(
        ErrorType.DATABASE_ERROR,
        '加载阅读进度失败',
        error
      );
      
      // 尝试从本地备份恢复
      if (enableBackup && progressHistoryRef.current.length > 0) {
        const lastValidProgress = progressHistoryRef.current.find(p => isValidProgress(p));
        if (lastValidProgress) {
          console.log('Using local backup as fallback');
          const fallbackProgress = validateProgressData(lastValidProgress, book);
          setReadingProgress(fallbackProgress);
          return fallbackProgress;
        }
      }
      
      // 创建默认进度作为最后的降级方案
      const fallbackProgress = createInitialProgress(book);
      setReadingProgress(fallbackProgress);
      return fallbackProgress;
    } finally {
      setIsLoading(false);
    }
  }, [book, setReadingProgress, createError, enableBackup, isValidProgress, backupProgress, performSave]);

  /**
   * 保存阅读进度
   */
  const saveProgress = useCallback(async (progressUpdates: Partial<ReadingProgress>): Promise<void> => {
    if (!book?.id || !readingProgress) return;

    // 自动检测当前位置（如果启用）
    let enhancedUpdates = { ...progressUpdates };
    if (enableAutoDetection && !progressUpdates.position) {
      enhancedUpdates.position = detectCurrentPosition();
    }

    // 更新本地状态
    const updatedProgress = {
      ...readingProgress,
      ...enhancedUpdates,
      lastUpdateTime: new Date()
    };

    // 验证更新后的进度数据
    if (!isValidProgress(updatedProgress)) {
      console.warn('Invalid progress data, attempting to fix...');
      const fixedProgress = validateProgressData(updatedProgress, book);
      updateReadingProgress(fixedProgress);
      pendingProgressRef.current = fixedProgress;
    } else {
      updateReadingProgress(updatedProgress);
      pendingProgressRef.current = updatedProgress;
    }

    setHasUnsavedChanges(true);

    // 备份当前进度（在保存前）
    if (enableBackup) {
      await backupProgress();
    }

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置防抖保存
    debounceTimerRef.current = setTimeout(async () => {
      const progressToSave = pendingProgressRef.current as ReadingProgress;
      await performSave(progressToSave);
    }, debounceDelay);
  }, [book?.id, readingProgress, updateReadingProgress, debounceDelay, enableAutoDetection, detectCurrentPosition, isValidProgress, validateProgressData, enableBackup, backupProgress]);

  /**
   * 执行实际的保存操作
   */
  const performSave = useCallback(async (progress: ReadingProgress): Promise<void> => {
    if (!book?.id) return;

    try {
      setIsSaving(true);
      await ipcClient.saveProgress(book.id, progress);
      setLastSaveTime(new Date());
      setHasUnsavedChanges(false);
      pendingProgressRef.current = null;
    } catch (error) {
      createError(
        ErrorType.DATABASE_ERROR,
        '保存阅读进度失败',
        error
      );
      // 保持未保存状态，以便稍后重试
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [book?.id, createError]);

  /**
   * 重置阅读进度
   */
  const resetProgress = useCallback(async (): Promise<void> => {
    if (!book?.id) return;

    try {
      setIsLoading(true);
      
      // 删除数据库中的进度
      await ipcClient.deleteProgress(book.id);
      
      // 创建新的初始进度
      const initialProgress = createInitialProgress(book);
      setReadingProgress(initialProgress);
      setHasUnsavedChanges(false);
      setLastSaveTime(null);
      
    } catch (error) {
      createError(
        ErrorType.DATABASE_ERROR,
        '重置阅读进度失败',
        error
      );
    } finally {
      setIsLoading(false);
    }
  }, [book, setReadingProgress, createError]);

  /**
   * 强制保存当前进度
   */
  const forceSave = useCallback(async (): Promise<void> => {
    if (pendingProgressRef.current) {
      await performSave(pendingProgressRef.current as ReadingProgress);
    }
  }, [performSave]);

  /**
   * 自动检测当前阅读位置
   */
  const detectCurrentPosition = useCallback((): string => {
    if (!enableAutoDetection) {
      return readingProgress?.position || 'page-1';
    }

    try {
      // 获取当前滚动位置和视口信息
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const contentHeight = document.documentElement.scrollHeight;
      
      // 更新位置检测数据
      positionDetectionRef.current = {
        lastScrollPosition: scrollTop,
        lastViewportHeight: viewportHeight,
        lastContentHeight: contentHeight
      };

      // 计算相对位置（百分比）
      const scrollPercentage = contentHeight > viewportHeight 
        ? (scrollTop / (contentHeight - viewportHeight)) * 100 
        : 0;

      // 尝试获取当前可见的元素ID或章节标识
      const visibleElements = document.elementsFromPoint(
        window.innerWidth / 2, 
        window.innerHeight / 2
      );
      
      let elementId = '';
      for (const element of visibleElements) {
        if (element.id && (element.id.startsWith('chapter-') || element.id.startsWith('page-'))) {
          elementId = element.id;
          break;
        }
      }

      // 生成精确的位置标识
      const position = elementId 
        ? `${elementId}:${Math.round(scrollPercentage)}%`
        : `scroll:${Math.round(scrollPercentage)}%:${scrollTop}`;

      return position;
    } catch (error) {
      console.warn('Failed to detect current position:', error);
      return readingProgress?.position || 'page-1';
    }
  }, [enableAutoDetection, readingProgress?.position]);

  /**
   * 备份当前进度
   */
  const backupProgress = useCallback(async (): Promise<void> => {
    if (!enableBackup || !readingProgress) return;

    try {
      // 添加到历史记录
      const backup = { ...readingProgress };
      progressHistoryRef.current = [
        backup,
        ...progressHistoryRef.current.slice(0, 9) // 保留最近10个备份
      ];

      // 可选：保存到本地存储作为额外备份
      const backupKey = `progress_backup_${book.id}`;
      localStorage.setItem(backupKey, JSON.stringify(progressHistoryRef.current));
    } catch (error) {
      console.warn('Failed to backup progress:', error);
    }
  }, [enableBackup, readingProgress, book.id]);

  /**
   * 恢复进度数据
   */
  const restoreProgress = useCallback(async (backupData: ReadingProgress): Promise<void> => {
    try {
      setIsLoading(true);

      // 验证备份数据
      if (!isValidProgress(backupData)) {
        throw new Error('Invalid backup data');
      }

      // 恢复进度
      setReadingProgress(backupData);
      await performSave(backupData);
      
      setHasUnsavedChanges(false);
    } catch (error) {
      createError(
        ErrorType.DATABASE_ERROR,
        '恢复阅读进度失败',
        error
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isValidProgress, setReadingProgress, performSave, createError]);

  /**
   * 获取进度历史记录
   */
  const getProgressHistory = useCallback((): ReadingProgress[] => {
    return [...progressHistoryRef.current];
  }, []);

  // 组件挂载时加载进度
  useEffect(() => {
    if (book?.id) {
      loadProgress();
    }
  }, [book?.id, loadProgress]);

  // 设置自动保存定时器
  useEffect(() => {
    if (hasUnsavedChanges && autoSaveInterval > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        if (pendingProgressRef.current) {
          performSave(pendingProgressRef.current as ReadingProgress);
        }
      }, autoSaveInterval);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSaveInterval, performSave]);

  // 组件卸载时清理定时器并保存未保存的更改
  useEffect(() => {
    return () => {
      // 清理定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // 如果有未保存的更改，立即保存
      if (hasUnsavedChanges && pendingProgressRef.current) {
        // 注意：这里使用同步方式，因为组件即将卸载
        ipcClient.saveProgress(book.id, pendingProgressRef.current as ReadingProgress)
          .catch(console.error);
      }
    };
  }, [book?.id, hasUnsavedChanges]);

  // 页面可见性变化时的处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedChanges) {
        // 页面隐藏时立即保存
        forceSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasUnsavedChanges, forceSave]);

  // 自动位置检测（滚动事件监听）
  useEffect(() => {
    if (!enableAutoDetection || !book?.id) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // 防抖处理滚动事件
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentPosition = detectCurrentPosition();
        const currentScrollData = positionDetectionRef.current;
        
        // 只有位置发生显著变化时才更新
        const scrollDiff = Math.abs(
          currentScrollData.lastScrollPosition - 
          (window.pageYOffset || document.documentElement.scrollTop)
        );
        
        if (scrollDiff > 50) { // 滚动超过50px才更新
          saveProgress({ position: currentPosition });
        }
      }, 500); // 500ms防抖
    };

    const handleResize = () => {
      // 窗口大小变化时也更新位置
      const currentPosition = detectCurrentPosition();
      saveProgress({ position: currentPosition });
    };

    // 添加事件监听器
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [enableAutoDetection, book?.id, detectCurrentPosition, saveProgress]);

  // 定期检查和清理过期的备份数据
  useEffect(() => {
    if (!enableBackup || !book?.id) return;

    const cleanupInterval = setInterval(() => {
      try {
        // 清理超过7天的备份数据
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        progressHistoryRef.current = progressHistoryRef.current.filter(
          progress => new Date(progress.lastUpdateTime) > sevenDaysAgo
        );

        // 更新本地存储
        const backupKey = `progress_backup_${book.id}`;
        localStorage.setItem(backupKey, JSON.stringify(progressHistoryRef.current));
      } catch (error) {
        console.warn('Failed to cleanup progress history:', error);
      }
    }, 60000 * 60); // 每小时清理一次

    return () => clearInterval(cleanupInterval);
  }, [enableBackup, book?.id]);

  return {
    currentProgress: readingProgress,
    isLoading,
    isSaving,
    lastSaveTime,
    saveProgress,
    loadProgress,
    resetProgress,
    hasUnsavedChanges,
    backupProgress,
    restoreProgress,
    getProgressHistory,
    detectCurrentPosition,
    isValidProgress
  };
};

/**
 * 验证进度数据的完整性并修复异常数据
 */
function validateProgressData(progress: ReadingProgress, book: BookMetadata): ReadingProgress {
  const validated = { ...progress };
  let hasChanges = false;

  // 验证并修复书籍ID
  if (validated.bookId !== book.id) {
    validated.bookId = book.id;
    hasChanges = true;
  }

  // 验证并修复页码范围
  if (validated.currentPage < 1) {
    validated.currentPage = 1;
    hasChanges = true;
  } else if (validated.currentPage > book.totalPages) {
    validated.currentPage = book.totalPages;
    hasChanges = true;
  }

  // 验证并修复章节索引
  if (validated.currentChapter < 0) {
    validated.currentChapter = 0;
    hasChanges = true;
  }

  // 验证并修复百分比
  const calculatedPercentage = Math.round((validated.currentPage / book.totalPages) * 100);
  if (Math.abs(validated.percentage - calculatedPercentage) > 1) {
    validated.percentage = calculatedPercentage;
    hasChanges = true;
  }

  // 验证并修复位置信息
  if (!validated.position || typeof validated.position !== 'string') {
    validated.position = `page-${validated.currentPage}`;
    hasChanges = true;
  }

  // 验证并修复时间戳
  const updateTime = new Date(validated.lastUpdateTime);
  if (!validated.lastUpdateTime || isNaN(updateTime.getTime()) || updateTime > new Date()) {
    validated.lastUpdateTime = new Date();
    hasChanges = true;
  }

  // 如果数据被修复，记录警告
  if (hasChanges) {
    console.warn('Progress data was corrupted and has been repaired:', {
      original: progress,
      validated: validated
    });
  }

  return validated;
}

/**
 * 创建初始阅读进度
 */
function createInitialProgress(book: BookMetadata): ReadingProgress {
  const now = new Date();
  
  return {
    bookId: book.id,
    currentPage: 1,
    currentChapter: 0,
    percentage: 0,
    position: 'page-1',
    lastUpdateTime: now
  };
}

/**
 * 从本地存储恢复进度历史
 */
function restoreProgressHistory(bookId: string): ReadingProgress[] {
  try {
    const backupKey = `progress_backup_${bookId}`;
    const stored = localStorage.getItem(backupKey);
    if (stored) {
      const history = JSON.parse(stored);
      return Array.isArray(history) ? history : [];
    }
  } catch (error) {
    console.warn('Failed to restore progress history:', error);
  }
  return [];
}