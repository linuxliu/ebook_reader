import React from 'react';
import { BookMetadata } from '../../../shared/types';
import { highlightSearchText } from '../../utils/searchHighlight';

interface BookListItemProps {
  book: BookMetadata;
  onClick: () => void;
  onDelete: () => void;
  searchQuery?: string;
}

const BookListItem: React.FC<BookListItemProps> = React.memo(({ book, onClick, onDelete, searchQuery = '' }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFormatColor = (format: string): string => {
    switch (format.toLowerCase()) {
      case 'epub':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pdf':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'mobi':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'txt':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      onClick={onClick}
    >
      {/* 封面缩略图 */}
      <div className="flex-shrink-0 w-10 h-14 sm:w-12 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* 默认封面 */}
        <div className={`w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 ${book.cover ? 'hidden' : ''}`}>
          <div className="text-sm sm:text-lg">📖</div>
        </div>
      </div>

      {/* 书籍信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 标题和格式 */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 dark:text-white truncate" title={book.title}>
                {highlightSearchText(book.title, searchQuery)}
              </h3>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getFormatColor(book.format)}`}>
                {book.format.toUpperCase()}
              </span>
              {book.lastReadDate && (
                <div className="text-sm text-blue-600 dark:text-blue-400" title="最近阅读">
                  📖
                </div>
              )}
            </div>

            {/* 作者 */}
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1" title={book.author}>
              {highlightSearchText(book.author, searchQuery)}
            </p>

            {/* 元信息 */}
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
              <span>{book.totalPages} 页</span>
              <span className="hidden sm:inline">{formatFileSize(book.fileSize)}</span>
              <span className="hidden md:inline">导入于 {formatDate(book.importDate)}</span>
              {book.lastReadDate && (
                <span className="hidden lg:inline">最近阅读 {formatDate(book.lastReadDate)}</span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              title="删除书籍"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 悬停效果 */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 rounded-lg transition-all duration-200 pointer-events-none" />
    </div>
  );
});

BookListItem.displayName = 'BookListItem';

export default BookListItem;