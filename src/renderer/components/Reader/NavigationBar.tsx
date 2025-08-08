import React, { useState, useRef, useEffect } from 'react';

interface NavigationBarProps {
  currentPage: number;
  totalPages: number;
  currentChapter: string;
  progress: number; // 0-100
  onGoToPage: (page: number) => void;
  onToggleToc: () => void;
  isFullscreen: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPage,
  totalPages,
  currentChapter,
  progress,
  onGoToPage,
  onToggleToc,
  isFullscreen
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page);
      setShowPageInput(false);
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowPageInput(false);
      setPageInputValue(currentPage.toString());
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const targetPage = Math.max(1, Math.min(totalPages, Math.round((percentage / 100) * totalPages)));
    
    onGoToPage(targetPage);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleProgressBarClick(e);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleProgressBarClick(e);
  };

  const handleProgressBarMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseUp = () => setIsDragging(false);
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const navClasses = `
    navigation-bar
    ${isFullscreen 
      ? 'fixed bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white opacity-0 hover:opacity-100 transition-opacity duration-300' 
      : 'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'
    }
    px-6 py-4 z-30
  `;

  return (
    <div className={navClasses}>
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left section - TOC button and chapter info */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleToc}
            className={`
              p-2 rounded-lg transition-colors
              ${isFullscreen 
                ? 'text-white hover:bg-white hover:bg-opacity-20' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            title="显示目录"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:block">
            <p className={`text-sm font-medium ${isFullscreen ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {currentChapter}
            </p>
          </div>
        </div>

        {/* Center section - Progress bar and page info */}
        <div className="flex-1 max-w-md mx-6">
          <div className="space-y-2">
            {/* Page info */}
            <div className="flex items-center justify-center space-x-2">
              {showPageInput ? (
                <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInputValue}
                    onChange={(e) => setPageInputValue(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
                    onBlur={() => setShowPageInput(false)}
                    className={`
                      w-16 px-2 py-1 text-sm text-center border rounded
                      ${isFullscreen 
                        ? 'bg-black bg-opacity-50 border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      }
                    `}
                    autoFocus
                  />
                  <span className={`text-sm ${isFullscreen ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    / {totalPages}
                  </span>
                </form>
              ) : (
                <button
                  onClick={() => setShowPageInput(true)}
                  className={`
                    text-sm transition-colors px-2 py-1 rounded
                    ${isFullscreen 
                      ? 'text-white hover:bg-white hover:bg-opacity-20' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  title="点击跳转到指定页面"
                >
                  第 {currentPage} 页 / 共 {totalPages} 页
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative">
              <div
                ref={progressBarRef}
                className={`
                  h-2 rounded-full cursor-pointer transition-all duration-200
                  ${isFullscreen 
                    ? 'bg-white bg-opacity-30 hover:bg-opacity-40' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                `}
                onMouseDown={handleProgressBarMouseDown}
                onMouseMove={handleProgressBarMouseMove}
                onMouseUp={handleProgressBarMouseUp}
                title={`阅读进度 ${progress}%`}
              >
                <div
                  className={`
                    h-full rounded-full transition-all duration-300
                    ${isFullscreen ? 'bg-white' : 'bg-blue-600'}
                  `}
                  style={{ width: `${progress}%` }}
                />
                
                {/* Progress handle */}
                <div
                  className={`
                    absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-200
                    ${isDragging ? 'scale-125' : 'scale-100'}
                    ${isFullscreen 
                      ? 'bg-white border-white shadow-lg' 
                      : 'bg-blue-600 border-white dark:border-gray-800 shadow-md'
                    }
                  `}
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right section - Progress percentage */}
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${isFullscreen ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Keyboard shortcuts hint for fullscreen */}
      {isFullscreen && (
        <div className="text-center mt-2">
          <div className="text-xs text-white text-opacity-75">
            点击进度条跳转 | ← → 翻页 | ESC 退出全屏
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationBar;