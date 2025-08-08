import React, { useState, useMemo } from 'react';
import { BookMetadata, ViewMode, SortBy, AppError } from '../../../shared/types';
import BookCard from './BookCard';
import BookListItem from './BookListItem';
import ViewModeToggle from './ViewModeToggle';
import SortSelector from './SortSelector';
import SearchBar from './SearchBar';
import ImportButton from './ImportButton';
import ImportDropZone from './ImportDropZone';
import { ToastContainer, useToast } from '../common/Toast';
import { matchesAnyField } from '../../utils/searchHighlight';
import { useDebounce } from '../../hooks/useDebounce';

interface BookshelfProps {
  books: BookMetadata[];
  onBookSelect: (book: BookMetadata) => void;
  onBookAdd: (book: BookMetadata) => void;
  onDeleteBook: (bookId: string) => void;
}

const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  onBookSelect,
  onBookAdd,
  onDeleteBook
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toast 管理
  const { messages, removeToast, showSuccess, showErrorFromAppError } = useToast();
  
  // 防抖搜索查询，减少频繁的过滤操作
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // 过滤和排序书籍
  const filteredAndSortedBooks = useMemo(() => {
    let filtered = books;

    // 搜索过滤 - 使用防抖后的查询
    if (debouncedSearchQuery.trim()) {
      filtered = books.filter(book => 
        matchesAnyField([book.title, book.author], debouncedSearchQuery)
      );
    }

    // 排序
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title, 'zh-CN');
        case 'author':
          return a.author.localeCompare(b.author, 'zh-CN');
        case 'date':
          return new Date(b.importDate).getTime() - new Date(a.importDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [books, debouncedSearchQuery, sortBy]);

  const handleBookSelect = (book: BookMetadata) => {
    onBookSelect(book);
  };

  const handleDeleteBook = (bookId: string) => {
    if (window.confirm('确定要删除这本书吗？')) {
      onDeleteBook(bookId);
    }
  };

  const handleImportSuccess = (book: BookMetadata) => {
    onBookAdd(book);
    showSuccess(
      '导入成功',
      `《${book.title}》已成功添加到书架`,
      { duration: 4000 }
    );
  };

  const handleImportError = (error: AppError) => {
    showErrorFromAppError(error, '导入失败');
  };

  return (
    <ImportDropZone
      onImportSuccess={handleImportSuccess}
      onImportError={handleImportError}
    >
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* 头部工具栏 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start lg:items-center justify-between">
          {/* 左侧：搜索和导入 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 w-full lg:w-auto">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索书名或作者..."
              />
            </div>
            <div className="flex-shrink-0">
              <ImportButton 
                onImportSuccess={handleImportSuccess}
                onImportError={handleImportError}
              />
            </div>
          </div>

          {/* 右侧：视图控制 */}
          <div className="flex gap-2 sm:gap-3 items-center justify-between sm:justify-start w-full lg:w-auto">
            <div className="flex gap-2 sm:gap-3 items-center">
              <SortSelector value={sortBy} onChange={setSortBy} />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
            
            {/* 统计信息 - 移动端显示在右侧 */}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 lg:hidden">
              {debouncedSearchQuery ? (
                <>{filteredAndSortedBooks.length}</>
              ) : (
                <>{books.length}</>
              )}
            </div>
          </div>
        </div>

        {/* 统计信息 - 桌面端显示在下方 */}
        <div className="hidden lg:block mt-3 text-sm text-gray-600 dark:text-gray-400">
          {debouncedSearchQuery ? (
            <>
              找到 {filteredAndSortedBooks.length} 本书籍
              {filteredAndSortedBooks.length !== books.length && (
                <span className="ml-2 text-xs">
                  (共 {books.length} 本)
                </span>
              )}
            </>
          ) : (
            <>共 {books.length} 本书籍</>
          )}
        </div>
      </div>

      {/* 书籍列表 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAndSortedBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {debouncedSearchQuery ? (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  未找到匹配的书籍
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  尝试使用不同的关键词搜索
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  清除搜索
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  书架空空如也
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  导入您的第一本电子书开始阅读之旅
                </p>
                <ImportButton 
                  onImportSuccess={handleImportSuccess}
                  onImportError={handleImportError}
                />
              </>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4'
              : 'space-y-2'
          }>
            {filteredAndSortedBooks.map(book => (
              viewMode === 'grid' ? (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => handleBookSelect(book)}
                  onDelete={() => handleDeleteBook(book.id)}
                  searchQuery={debouncedSearchQuery}
                />
              ) : (
                <BookListItem
                  key={book.id}
                  book={book}
                  onClick={() => handleBookSelect(book)}
                  onDelete={() => handleDeleteBook(book.id)}
                  searchQuery={debouncedSearchQuery}
                />
              )
            ))}
          </div>
        )}
      </div>

        {/* Toast 通知 */}
        <ToastContainer messages={messages} onRemove={removeToast} />
      </div>
    </ImportDropZone>
  );
};

export default Bookshelf;