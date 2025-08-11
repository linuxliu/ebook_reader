import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookMetadata, BookContent, ReadingProgress, ReadingSettings, VocabularyItem } from '../../../shared/types';
import ReaderToolbar from './ReaderToolbar';
import ReaderContent from './ReaderContent';
import PageControls from './PageControls';
import TableOfContents from './TableOfContents';
import NavigationBar from './NavigationBar';
import ProgressIndicator from './ProgressIndicator';
import ProgressSaveStatus from './ProgressSaveStatus';
import ProgressRecovery from './ProgressRecovery';
import ResizablePanels from './ResizablePanels';
import SettingsPanel from '../Settings/SettingsPanel';
import { useReadingProgressManager } from '../../hooks/useReadingProgressManager';
import { useDynamicPagination } from '../../hooks/useDynamicPagination';

interface ReaderProps {
  book: BookMetadata;
  content: BookContent;
  progress: ReadingProgress;
  settings: ReadingSettings;
  onProgressChange: (progress: ReadingProgress) => void;
  onSettingsChange: (settings: ReadingSettings) => void;
  onAddToVocabulary?: (word: VocabularyItem) => void;
  onClose: () => void;
}

const Reader: React.FC<ReaderProps> = ({
  book,
  content,
  progress,
  settings,
  onProgressChange,
  onSettingsChange,
  onAddToVocabulary,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showProgressRecovery, setShowProgressRecovery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [contentAreaSize, setContentAreaSize] = useState({ width: 800, height: 600 });

  // 使用动态分页系统
  const pagination = useDynamicPagination({
    content,
    settings,
    containerWidth: contentAreaSize.width,
    containerHeight: contentAreaSize.height
  });

  // 使用阅读进度管理器
  const progressManager = useReadingProgressManager({
    book: { ...book, totalPages: pagination.totalPages }, // 使用动态计算的总页数
    autoSaveInterval: 5000, // 5秒自动保存
    debounceDelay: 1000, // 1秒防抖
    enableAutoDetection: true, // 启用自动位置检测
    enableBackup: true // 启用进度备份
  });

  // Initialize pagination with current progress
  useEffect(() => {
    if (progressManager.currentProgress) {
      pagination.goToPage(progressManager.currentProgress.currentPage);
    } else {
      pagination.goToPage(progress.currentPage);
    }
  }, [progress.currentPage, progressManager.currentProgress, pagination]);
  const readerRef = useRef<HTMLDivElement>(null);

  // 监听容器尺寸变化
  useEffect(() => {
    const updateContainerSize = () => {
      if (readerRef.current) {
        const rect = readerRef.current.getBoundingClientRect();
        const newSize = {
          width: rect.width || 800,
          height: rect.height || 600
        };
        setContainerSize(newSize);
        
        // 如果目录未显示，内容区域使用全宽
        if (!showToc) {
          setContentAreaSize(newSize);
        }
      }
    };

    // 初始化尺寸
    updateContainerSize();

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (readerRef.current) {
      resizeObserver.observe(readerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [showToc]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          handlePreviousPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault();
          handleNextPage();
          break;
        case 'Home':
          event.preventDefault();
          handleGoToPage(1);
          break;
        case 'End':
          event.preventDefault();
          handleGoToPage(pagination.totalPages);
          break;
        case 'F11':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            event.preventDefault();
            setIsFullscreen(false);
          } else if (showToc) {
            event.preventDefault();
            setShowToc(false);
          }
          break;
        case 't':
        case 'T':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleToggleToc();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pagination.currentPage, pagination.totalPages, isFullscreen]);

  // 首先定义updateProgress，因为其他函数都依赖它
  const updateProgress = useCallback(async (page: number) => {
    const pageInfo = pagination.getCurrentPageInfo();
    const chapterIndex = pageInfo?.chapterIndex || 0;
    
    console.log(`Page ${page}: Chapter ${chapterIndex} - Dynamic pagination`);

    const progressUpdates = {
      currentPage: page,
      currentChapter: chapterIndex,
      percentage: Math.round((page / pagination.totalPages) * 100),
      position: `page-${page}`
    };
    
    // 使用进度管理器保存进度
    try {
      await progressManager.saveProgress(progressUpdates);
      // 同时调用原有的回调以保持兼容性
      onProgressChange({
        ...progressManager.currentProgress!,
        ...progressUpdates,
        lastUpdateTime: new Date()
      });
    } catch (error) {
      console.error('Failed to save reading progress:', error);
      // 即使保存失败，也要更新本地状态
      onProgressChange({
        ...progress,
        ...progressUpdates,
        lastUpdateTime: new Date()
      });
    }
  }, [pagination, progressManager, onProgressChange, progress]);

  const handleNextPage = useCallback(() => {
    pagination.nextPage();
    updateProgress(pagination.currentPage + 1);
  }, [pagination, updateProgress]);

  const handlePreviousPage = useCallback(() => {
    pagination.previousPage();
    updateProgress(pagination.currentPage - 1);
  }, [pagination, updateProgress]);

  const handleGoToPage = useCallback((page: number) => {
    console.log(`Jumping to page ${page} of ${pagination.totalPages}`);
    pagination.goToPage(page);
    updateProgress(page);
  }, [pagination, updateProgress]);

  // Handle mouse wheel navigation
  const handleWheel = useCallback((event: WheelEvent) => {
    if (settings.pageMode === 'pagination') {
      event.preventDefault();
      if (event.deltaY > 0) {
        handleNextPage();
      } else if (event.deltaY < 0) {
        handlePreviousPage();
      }
    }
  }, [settings.pageMode, handleNextPage, handlePreviousPage]);

  useEffect(() => {
    const readerElement = readerRef.current;
    if (readerElement && settings.pageMode === 'pagination') {
      readerElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => readerElement.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, settings.pageMode]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    // Request fullscreen API if available
    if (!isFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else if (isFullscreen && document.exitFullscreen) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);

  const getCurrentChapter = () => {
    const pageInfo = pagination.getCurrentPageInfo();
    if (pageInfo && content.chapters[pageInfo.chapterIndex]) {
      return content.chapters[pageInfo.chapterIndex];
    }
    return content.chapters[0];
  };

  const getPageContent = () => {
    if (settings.pageMode === 'scroll') {
      // 滚动模式：显示当前章节的完整内容
      const chapter = getCurrentChapter();
      return chapter?.content || '';
    } else {
      // 分页模式：使用动态分页系统获取当前页内容
      return pagination.getPageContent(pagination.currentPage);
    }
  };

  const handleToggleToc = useCallback(() => {
    setShowToc(!showToc);
  }, [showToc]);

  // 处理面板大小变化
  const handlePanelSizeChange = useCallback((leftWidth: number, rightWidth: number) => {
    // 更新内容区域大小，触发重新分页
    setContentAreaSize(prev => ({
      ...prev,
      width: rightWidth
    }));
  }, []);

  // 处理目录显示/隐藏
  const handleTocVisibilityChange = useCallback((visible: boolean) => {
    setShowToc(visible);
    // 当目录隐藏时，内容区域使用全宽；显示时需要减去目录宽度
    if (!visible) {
      setContentAreaSize(prev => ({
        ...prev,
        width: containerSize.width
      }));
    } else {
      // 目录显示时，内容区域宽度需要减去默认目录宽度
      setContentAreaSize(prev => ({
        ...prev,
        width: containerSize.width - 320 // 默认目录宽度
      }));
    }
  }, [containerSize.width]);

  const handleChapterSelect = useCallback((page: number) => {
    // 直接使用动态分页系统的页码
    pagination.goToPage(page);
    updateProgress(page);
    // 不再自动关闭目录，让用户自己决定是否关闭
  }, [pagination, updateProgress]);

  // 处理进度条点击跳转
  const handleProgressJump = useCallback((percentage: number) => {
    const targetPage = Math.max(1, Math.min(pagination.totalPages, Math.round((percentage / 100) * pagination.totalPages)));
    handleGoToPage(targetPage);
  }, [pagination.totalPages, handleGoToPage]);

  // 重置阅读进度
  const handleResetProgress = useCallback(async () => {
    if (window.confirm('确定要重置阅读进度吗？这将清除当前书籍的所有阅读记录。')) {
      try {
        await progressManager.resetProgress();
        pagination.goToPage(1);
      } catch (error) {
        console.error('Failed to reset progress:', error);
      }
    }
  }, [progressManager, pagination]);

  // 显示进度恢复界面
  const handleShowProgressRecovery = useCallback(() => {
    setShowProgressRecovery(true);
  }, []);

  // 恢复进度
  const handleRestoreProgress = useCallback(async (backupProgress: ReadingProgress) => {
    try {
      await progressManager.restoreProgress(backupProgress);
      pagination.goToPage(backupProgress.currentPage);
      
      // 通知父组件进度已更新
      onProgressChange(backupProgress);
    } catch (error) {
      console.error('Failed to restore progress:', error);
    }
  }, [progressManager, pagination, onProgressChange]);

  // 手动备份当前进度
  const handleBackupProgress = useCallback(async () => {
    try {
      await progressManager.backupProgress();
      // 可以显示成功提示
      console.log('Progress backed up successfully');
    } catch (error) {
      console.error('Failed to backup progress:', error);
    }
  }, [progressManager]);

  return (
    <div 
      ref={readerRef}
      className={`reader-container ${isFullscreen ? 'fullscreen' : ''} ${settings.theme === 'dark' ? 'dark bg-slate-900' : 'bg-white'} transition-all duration-300`}
      style={{
        fontFamily: settings.fontFamily,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      {/* Toolbar - hidden in fullscreen */}
      {!isFullscreen && (
        <ReaderToolbar
          book={book}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          currentChapter={getCurrentChapter()}
          isFullscreen={isFullscreen}
          onClose={onClose}
          onToggleFullscreen={toggleFullscreen}
          onGoToPage={handleGoToPage}
          onToggleToc={handleToggleToc}
          onToggleSettings={handleToggleSettings}
        />
      )}

      {/* Main content area */}
      <div className="reader-main flex-1 flex relative">
        <ResizablePanels
          leftPanel={
            <TableOfContents
              toc={pagination.getDynamicToc()}
              currentPage={pagination.currentPage}
              isVisible={true} // 在ResizablePanels内部时总是可见
              onToggle={() => {}} // 切换由ResizablePanels处理
              onChapterSelect={handleChapterSelect}
              onClose={() => handleTocVisibilityChange(false)} // 提供关闭功能
            />
          }
          rightPanel={
            pagination.isCalculating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">正在根据字体设置计算分页...</p>
                </div>
              </div>
            ) : (
              <ReaderContent
                content={getPageContent()}
                settings={settings}
                isFullscreen={isFullscreen}
                bookId={book.id}
                onSettingsChange={onSettingsChange}
                onAddToVocabulary={onAddToVocabulary}
              />
            )
          }
          leftPanelVisible={showToc}
          onLeftPanelVisibilityChange={handleTocVisibilityChange}
          onPanelSizeChange={handlePanelSizeChange}
          minLeftWidth={250}
          maxLeftWidth={500}
          defaultLeftWidth={320}
        />
      </div>

      {/* Navigation Bar with Progress */}
      {!isFullscreen && (
        <>
          <NavigationBar
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            currentChapter={getCurrentChapter().title}
            progress={Math.round((pagination.currentPage / pagination.totalPages) * 100)}
            onGoToPage={handleGoToPage}
            onToggleToc={handleToggleToc}
            isFullscreen={isFullscreen}
          />
          
          {/* 详细进度指示器 */}
          {progressManager.currentProgress && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <ProgressIndicator
                progress={progressManager.currentProgress}
                totalPages={book.totalPages}
                showDetails={true}
                onProgressClick={handleProgressJump}
                className="mb-2"
              />
              
              {/* 保存状态指示器 */}
              <div className="flex justify-between items-center">
                <ProgressSaveStatus
                  isSaving={progressManager.isSaving}
                  hasUnsavedChanges={progressManager.hasUnsavedChanges}
                  lastSaveTime={progressManager.lastSaveTime}
                />
                
                {/* 进度管理操作 */}
                <div className="flex items-center space-x-2">
                  {progressManager.getProgressHistory().length > 0 && (
                    <button
                      onClick={handleShowProgressRecovery}
                      className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="恢复历史进度"
                    >
                      恢复进度
                    </button>
                  )}
                  
                  <button
                    onClick={handleBackupProgress}
                    className="text-xs text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                    title="手动备份当前进度"
                  >
                    备份进度
                  </button>
                  
                  <button
                    onClick={handleResetProgress}
                    className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="重置阅读进度"
                  >
                    重置进度
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Page controls */}
      <PageControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onGoToPage={handleGoToPage}
        isFullscreen={isFullscreen}
      />

      {/* Fullscreen overlay controls */}
      {isFullscreen && (
        <>
          {/* Top navigation bar for fullscreen */}
          <NavigationBar
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            currentChapter={getCurrentChapter().title}
            progress={Math.round((pagination.currentPage / pagination.totalPages) * 100)}
            onGoToPage={handleGoToPage}
            onToggleToc={handleToggleToc}
            isFullscreen={isFullscreen}
          />
          
          {/* 全屏模式下的简化进度指示器 */}
          {progressManager.currentProgress && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300">
              <ProgressIndicator
                progress={progressManager.currentProgress}
                totalPages={book.totalPages}
                showDetails={false}
                onProgressClick={handleProgressJump}
                className="min-w-64"
              />
            </div>
          )}

          {/* Exit fullscreen button */}
          <div className="fullscreen-controls fixed top-4 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={toggleFullscreen}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
              title="退出全屏 (ESC)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowSettings(false)}
          showPreview={true}
        />
      )}

      {/* Progress Recovery Modal */}
      <ProgressRecovery
        progressHistory={progressManager.getProgressHistory()}
        currentProgress={progressManager.currentProgress}
        onRestore={handleRestoreProgress}
        onClose={() => setShowProgressRecovery(false)}
        isVisible={showProgressRecovery}
      />
    </div>
  );
};

export default Reader;