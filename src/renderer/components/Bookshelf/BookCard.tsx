import React from 'react';
import { BookMetadata } from '../../../shared/types';
import { highlightSearchText } from '../../utils/searchHighlight';

interface BookCardProps {
  book: BookMetadata;
  onClick: () => void;
  onDelete: () => void;
  searchQuery?: string;
}

const BookCard: React.FC<BookCardProps> = React.memo(({ book, onClick, onDelete, searchQuery = '' }) => {
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
      className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden"
      onClick={onClick}
    >
      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
        title="删除书籍"
      >
        ×
      </button>

      {/* 封面区域 */}
      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
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
        <div className={`w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-4 ${book.cover ? 'hidden' : ''}`}>
          <div className="text-3xl mb-2">📖</div>
          <div className="text-xs text-center font-medium line-clamp-3">
            {book.title}
          </div>
        </div>
      </div>

      {/* 书籍信息 */}
      <div className="p-2 sm:p-3">
        {/* 格式标签 */}
        <div className="flex justify-between items-start mb-1 sm:mb-2">
          <span className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded ${getFormatColor(book.format)}`}>
            {book.format.toUpperCase()}
          </span>
          {book.lastReadDate && (
            <div className="text-xs text-blue-600 dark:text-blue-400" title="最近阅读">
              📖
            </div>
          )}
        </div>

        {/* 标题 */}
        <h3 className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-2 mb-1" title={book.title}>
          {highlightSearchText(book.title, searchQuery)}
        </h3>

        {/* 作者 */}
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-1 sm:mb-2" title={book.author}>
          {highlightSearchText(book.author, searchQuery)}
        </p>

        {/* 元信息 - 响应式显示 */}
        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-0.5 sm:space-y-1">
          <div className="flex justify-between">
            <span className="hidden sm:inline">页数</span>
            <span className="sm:hidden">页</span>
            <span>{book.totalPages}</span>
          </div>
          <div className="flex justify-between">
            <span className="hidden sm:inline">大小</span>
            <span className="sm:hidden">大小</span>
            <span>{formatFileSize(book.fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="hidden sm:inline">导入</span>
            <span className="sm:hidden">导入</span>
            <span>{formatDate(book.importDate)}</span>
          </div>
        </div>
      </div>

      {/* 悬停效果 */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 rounded-lg transition-all duration-200 pointer-events-none" />
    </div>
  );
});

BookCard.displayName = 'BookCard';

export default BookCard;