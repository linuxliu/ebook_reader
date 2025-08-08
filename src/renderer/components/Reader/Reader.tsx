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
import { useReadingProgressManager } from '../../hooks/useReadingProgressManager';

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
  const [currentPage, setCurrentPage] = useState(progress.currentPage);
  const [currentChapter, setCurrentChapter] = useState(progress.currentChapter);
  const [showToc, setShowToc] = useState(false);
  const [showProgressRecovery, setShowProgressRecovery] = useState(false);

  // 使用阅读进度管理器
  const progressManager = useReadingProgressManager({
    book,
    autoSaveInterval: 5000, // 5秒自动保存
    debounceDelay: 1000, // 1秒防抖
    enableAutoDetection: true, // 启用自动位置检测
    enableBackup: true // 启用进度备份
  });

  // Update local state when props change or progress manager loads new data
  useEffect(() => {
    if (progressManager.currentProgress) {
      setCurrentPage(progressManager.currentProgress.currentPage);
      setCurrentChapter(progressManager.currentProgress.currentChapter);
    } else {
      setCurrentPage(progress.currentPage);
      setCurrentChapter(progress.currentChapter);
    }
  }, [progress.currentPage, progress.currentChapter, progressManager.currentProgress]);
  const readerRef = useRef<HTMLDivElement>(null);

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
          handleGoToPage(book.totalPages);
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
  }, [currentPage, book.totalPages, isFullscreen]);

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
  }, [settings.pageMode, currentPage]);

  useEffect(() => {
    const readerElement = readerRef.current;
    if (readerElement && settings.pageMode === 'pagination') {
      readerElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => readerElement.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, settings.pageMode]);

  const handleNextPage = useCallback(() => {
    if (currentPage < book.totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      updateProgress(newPage);
    }
  }, [currentPage, book.totalPages]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      updateProgress(newPage);
    }
  }, [currentPage]);

  const handleGoToPage = useCallback((page: number) => {
    if (page >= 1 && page <= book.totalPages) {
      setCurrentPage(page);
      updateProgress(page);
    }
  }, [book.totalPages]);

  const updateProgress = useCallback(async (page: number) => {
    // Find the chapter for the current page
    let chapterIndex = 0;
    for (let i = 0; i < content.chapters.length; i++) {
      if (page >= content.chapters[i].startPage && 
          page < content.chapters[i].startPage + content.chapters[i].pageCount) {
        chapterIndex = i;
        break;
      }
    }

    const progressUpdates = {
      currentPage: page,
      currentChapter: chapterIndex,
      percentage: Math.round((page / book.totalPages) * 100),
      position: `page-${page}`
    };

    setCurrentChapter(chapterIndex);
    
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
  }, [content.chapters, book.totalPages, progress, progressManager, onProgressChange]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    // Request fullscreen API if available
    if (!isFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else if (isFullscreen && document.exitFullscreen) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen]);

  const getCurrentChapter = () => {
    return content.chapters[currentChapter] || content.chapters[0];
  };

  const getPageContent = () => {
    const chapter = getCurrentChapter();
    if (!chapter) return '';
    
    // Calculate which part of the chapter content to show based on current page
    const chapterStartPage = chapter.startPage;
    const pageInChapter = currentPage - chapterStartPage;
    
    // For now, return the full chapter content
    // In a real implementation, you'd split the content by pages
    return chapter.content;
  };

  const handleToggleToc = useCallback(() => {
    setShowToc(!showToc);
  }, [showToc]);

  const handleChapterSelect = useCallback((page: number) => {
    handleGoToPage(page);
    setShowToc(false); // Close TOC on mobile after selection
  }, [handleGoToPage]);

  // 处理进度条点击跳转
  const handleProgressJump = useCallback((percentage: number) => {
    const targetPage = Math.max(1, Math.min(book.totalPages, Math.round((percentage / 100) * book.totalPages)));
    handleGoToPage(targetPage);
  }, [book.totalPages, handleGoToPage]);

  // 重置阅读进度
  const handleResetProgress = useCallback(async () => {
    if (window.confirm('确定要重置阅读进度吗？这将清除当前书籍的所有阅读记录。')) {
      try {
        await progressManager.resetProgress();
        setCurrentPage(1);
        setCurrentChapter(0);
      } catch (error) {
        console.error('Failed to reset progress:', error);
      }
    }
  }, [progressManager]);

  // 显示进度恢复界面
  const handleShowProgressRecovery = useCallback(() => {
    setShowProgressRecovery(true);
  }, []);

  // 恢复进度
  const handleRestoreProgress = useCallback(async (backupProgress: ReadingProgress) => {
    try {
      await progressManager.restoreProgress(backupProgress);
      setCurrentPage(backupProgress.currentPage);
      setCurrentChapter(backupProgress.currentChapter);
      
      // 通知父组件进度已更新
      onProgressChange(backupProgress);
    } catch (error) {
      console.error('Failed to restore progress:', error);
    }
  }, [progressManager, onProgressChange]);

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
      className={`reader-container ${isFullscreen ? 'fullscreen' : ''} bg-white dark:bg-gray-900 transition-all duration-300`}
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
          currentPage={currentPage}
          totalPages={book.totalPages}
          currentChapter={getCurrentChapter()}
          isFullscreen={isFullscreen}
          onClose={onClose}
          onToggleFullscreen={toggleFullscreen}
          onGoToPage={handleGoToPage}
          onToggleToc={handleToggleToc}
        />
      )}

      {/* Main content area */}
      <div className="reader-main flex-1 flex relative">
        {/* Table of Contents */}
        <TableOfContents
          toc={content.toc}
          currentPage={currentPage}
          isVisible={showToc}
          onToggle={handleToggleToc}
          onChapterSelect={handleChapterSelect}
        />

        {/* Reader Content */}
        <div className={`flex-1 transition-all duration-300 ${showToc ? 'lg:ml-80' : ''}`}>
          <ReaderContent
            content={getPageContent()}
            settings={settings}
            isFullscreen={isFullscreen}
            bookId={book.id}
            onSettingsChange={onSettingsChange}
            onAddToVocabulary={onAddToVocabulary}
          />
        </div>
      </div>

      {/* Navigation Bar with Progress */}
      {!isFullscreen && (
        <>
          <NavigationBar
            currentPage={currentPage}
            totalPages={book.totalPages}
            currentChapter={getCurrentChapter().title}
            progress={Math.round((currentPage / book.totalPages) * 100)}
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
        currentPage={currentPage}
        totalPages={book.totalPages}
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
            currentPage={currentPage}
            totalPages={book.totalPages}
            currentChapter={getCurrentChapter().title}
            progress={Math.round((currentPage / book.totalPages) * 100)}
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