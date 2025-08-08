import React, { useState } from 'react';
import { BookMetadata, Chapter } from '../../../shared/types';

interface ReaderToolbarProps {
  book: BookMetadata;
  currentPage: number;
  totalPages: number;
  currentChapter: Chapter;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onGoToPage: (page: number) => void;
  onToggleToc?: () => void;
}

const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  book,
  currentPage,
  totalPages,
  currentChapter,
  isFullscreen,
  onClose,
  onToggleFullscreen,
  onGoToPage,
  onToggleToc
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState(currentPage.toString());

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

  const progressPercentage = Math.round((currentPage / totalPages) * 100);

  return (
    <div className="reader-toolbar bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      {/* Left section - Book info and navigation */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onClose}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="返回书架"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-xs">
            {book.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
            {book.author}
          </p>
        </div>
      </div>

      {/* Center section - Chapter info and progress */}
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {currentChapter.title}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {showPageInput ? (
              <form onSubmit={handlePageInputSubmit} className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={() => setShowPageInput(false)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                  / {totalPages}
                </span>
              </form>
            ) : (
              <button
                onClick={() => {
                  setShowPageInput(true);
                  setPageInputValue(currentPage.toString());
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                第 {currentPage} 页 / 共 {totalPages} 页
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center space-x-3">
          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
            {progressPercentage}%
          </span>
        </div>
      </div>

      {/* Right section - Controls */}
      <div className="flex items-center space-x-2">
        {onToggleToc && (
          <button
            onClick={onToggleToc}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="显示/隐藏目录 (Ctrl+T)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <button
          onClick={onToggleFullscreen}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isFullscreen ? "退出全屏 (F11)" : "全屏模式 (F11)"}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        <button
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="设置"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ReaderToolbar;