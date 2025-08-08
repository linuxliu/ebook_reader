// Optimized reader component with memory management and pagination
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookMetadata, BookContent, ReadingProgress, ReadingSettings } from '../../../shared/types';
import { useMemoryOptimization } from '../../hooks/useMemoryOptimization';
import { PerformanceMonitor, useOptimizedCallback } from '../../utils/performanceOptimization';

interface OptimizedReaderProps {
  book: BookMetadata;
  content: BookContent;
  progress: ReadingProgress;
  settings: ReadingSettings;
  onProgressChange: (progress: ReadingProgress) => void;
  onSettingsChange: (settings: ReadingSettings) => void;
  onClose: () => void;
}

interface PageChunk {
  id: string;
  content: string;
  chapterIndex: number;
  pageIndex: number;
}

// Memoized page component
const ReaderPage = memo<{
  chunk: PageChunk;
  settings: ReadingSettings;
  isVisible: boolean;
}>(({ chunk, settings, isVisible }) => {
  const pageRef = useRef<HTMLDivElement>(null);

  const pageStyle = useMemo(() => ({
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    padding: `${settings.margin}px`,
    minHeight: '100%',
    opacity: isVisible ? 1 : 0.3,
    transition: 'opacity 0.2s ease'
  }), [settings, isVisible]);

  return (
    <div
      ref={pageRef}
      className="reader-page"
      style={pageStyle}
      data-page-id={chunk.id}
      data-chapter={chunk.chapterIndex}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: chunk.content }}
        className="reader-content"
      />
    </div>
  );
});

export const OptimizedReader = memo<OptimizedReaderProps>(({
  book,
  content,
  progress,
  settings,
  onProgressChange,
  onSettingsChange,
  onClose
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(progress.currentPage - 1);
  const [isLoading, setIsLoading] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  
  // Memory optimization
  const {
    addToCache,
    getFromCache,
    registerCleanupCallback,
    getCacheStats
  } = useMemoryOptimization({
    enableAutoCleanup: true,
    cleanupThreshold: 75,
    maxCacheSize: 50
  });

  // Paginate content into chunks
  const pageChunks = useMemo(() => {
    const cacheKey = `chunks-${book.id}`;
    let cached = getFromCache(cacheKey);
    
    if (!cached) {
      const chunks: PageChunk[] = [];
      const wordsPerPage = Math.floor(1000 / (settings.fontSize / 16)); // Approximate
      
      content.chapters.forEach((chapter, chapterIndex) => {
        const words = chapter.content.split(/\s+/);
        let pageIndex = 0;
        
        for (let i = 0; i < words.length; i += wordsPerPage) {
          const pageWords = words.slice(i, i + wordsPerPage);
          const pageContent = pageWords.join(' ');
          
          chunks.push({
            id: `${chapter.id}-page-${pageIndex}`,
            content: pageContent,
            chapterIndex,
            pageIndex: chunks.length
          });
          
          pageIndex++;
        }
      });
      
      cached = chunks;
      addToCache(cacheKey, cached);
    }
    
    return cached as PageChunk[];
  }, [book.id, content.chapters, settings.fontSize, addToCache, getFromCache]);

  // Get visible pages (current + adjacent for smooth scrolling)
  const visiblePages = useMemo(() => {
    const visibleCount = 3; // Current + 1 before + 1 after
    const start = Math.max(0, currentPageIndex - 1);
    const end = Math.min(pageChunks.length, currentPageIndex + visibleCount);
    
    return pageChunks.slice(start, end);
  }, [pageChunks, currentPageIndex]);

  // Navigation handlers
  const goToPage = useOptimizedCallback((pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pageChunks.length) return;
    
    setCurrentPageIndex(pageIndex);
    
    // Update progress
    const newProgress: ReadingProgress = {
      ...progress,
      currentPage: pageIndex + 1,
      percentage: ((pageIndex + 1) / pageChunks.length) * 100,
      position: `page-${pageIndex}`,
      lastUpdateTime: new Date()
    };
    
    onProgressChange(newProgress);
  }, [pageChunks.length, progress, onProgressChange]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [currentPageIndex, goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPageIndex - 1);
  }, [currentPageIndex, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          goToNextPage();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousPage();
          break;
        case 'Home':
          event.preventDefault();
          goToPage(0);
          break;
        case 'End':
          event.preventDefault();
          goToPage(pageChunks.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPreviousPage, goToPage, pageChunks.length]);

  // Register cleanup callback
  useEffect(() => {
    return registerCleanupCallback(() => {
      // Clear any reader-specific caches
      console.log('Cleaning up reader resources');
    });
  }, [registerCleanupCallback]);

  // Preload adjacent pages
  useEffect(() => {
    const preloadPages = () => {
      const preloadRange = 2;
      const start = Math.max(0, currentPageIndex - preloadRange);
      const end = Math.min(pageChunks.length, currentPageIndex + preloadRange + 1);
      
      for (let i = start; i < end; i++) {
        const cacheKey = `page-${i}`;
        if (!getFromCache(cacheKey)) {
          addToCache(cacheKey, pageChunks[i]);
        }
      }
    };

    const timeoutId = setTimeout(preloadPages, 100);
    return () => clearTimeout(timeoutId);
  }, [currentPageIndex, pageChunks, addToCache, getFromCache]);

  const currentChunk = pageChunks[currentPageIndex];
  const cacheStats = getCacheStats();

  return (
    <PerformanceMonitor name="OptimizedReader">
      <div className="optimized-reader h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="reader-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← 返回书架
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPageIndex + 1} / {pageChunks.length}
            </span>
            <span className="text-sm text-gray-500">
              缓存: {cacheStats.size}/{cacheStats.maxSize}
            </span>
          </div>
        </div>

        {/* Reader Content */}
        <div 
          ref={readerRef}
          className="reader-content flex-1 overflow-hidden relative"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="reader-pages h-full">
              {visiblePages.map((chunk, index) => (
                <ReaderPage
                  key={chunk.id}
                  chunk={chunk}
                  settings={settings}
                  isVisible={chunk.pageIndex === currentPageIndex}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="reader-controls flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={goToPreviousPage}
            disabled={currentPageIndex === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max={pageChunks.length - 1}
              value={currentPageIndex}
              onChange={(e) => goToPage(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(((currentPageIndex + 1) / pageChunks.length) * 100)}%
            </span>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={currentPageIndex === pageChunks.length - 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </PerformanceMonitor>
  );
});