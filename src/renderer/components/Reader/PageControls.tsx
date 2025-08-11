import React, { useState } from 'react';

interface PageControlsProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  isFullscreen: boolean;
}

const PageControls: React.FC<PageControlsProps> = ({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  isFullscreen
}) => {
  const [showPageJump, setShowPageJump] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState('');

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageJumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page);
      setShowPageJump(false);
      setPageJumpValue('');
    }
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const controlsClasses = `
    page-controls
    fixed bottom-4 left-1/2 transform -translate-x-1/2
    ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}
    transition-opacity duration-300
    z-40
  `;

  return (
    <div className={controlsClasses}>
      <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-6 py-3">
        {/* Previous page button */}
        <button
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          className={`
            p-2 rounded-full transition-colors
            ${canGoPrevious 
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white' 
              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          title="上一页 (←)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page info and jump */}
        <div className="flex items-center space-x-2">
          {showPageJump ? (
            <form onSubmit={handlePageJumpSubmit} className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onBlur={() => {
                  setShowPageJump(false);
                  setPageJumpValue('');
                }}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={currentPage.toString()}
                autoFocus
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                / {totalPages}
              </span>
            </form>
          ) : (
            <button
              onClick={() => {
                setShowPageJump(true);
                setPageJumpValue(currentPage.toString());
              }}
              className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1 rounded"
              title="点击跳转到指定页面"
            >
              {currentPage} / {totalPages}
            </button>
          )}
        </div>

        {/* Next page button */}
        <button
          onClick={onNextPage}
          disabled={!canGoNext}
          className={`
            p-2 rounded-full transition-colors
            ${canGoNext 
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white' 
              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          title="下一页 (→)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      {isFullscreen && (
        <div className="mt-4 text-center">
          <div className="bg-black bg-opacity-50 text-white text-xs px-3 py-1 rounded-full">
            ← → 翻页 | F11 退出全屏 | ESC 退出
          </div>
        </div>
      )}
    </div>
  );
};

export default PageControls;