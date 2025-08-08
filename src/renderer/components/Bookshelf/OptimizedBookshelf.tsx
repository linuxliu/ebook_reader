// Memory-optimized bookshelf component with virtual scrolling
import React, { memo, useCallback, useMemo, useState } from 'react';
import { BookMetadata } from '../../../shared/types';
import { VirtualList } from '../common/VirtualList';
import { useMemoryOptimization, useListOptimization } from '../../hooks/useMemoryOptimization';
import { LazyImage, DebouncedInput, OptimizedListItem } from '../../utils/performanceOptimization';

interface OptimizedBookshelfProps {
  books: BookMetadata[];
  onBookSelect: (book: BookMetadata) => void;
  onBookAdd: (book: BookMetadata) => void;
  onDeleteBook: (bookId: string) => void;
}

// Memoized book card component
const BookCard = memo<{
  book: BookMetadata;
  onSelect: (book: BookMetadata) => void;
  onDelete: (bookId: string) => void;
  viewMode: 'grid' | 'list';
}>(({ book, onSelect, onDelete, viewMode }) => {
  const handleSelect = useCallback(() => {
    onSelect(book);
  }, [book, onSelect]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(book.id);
  }, [book.id, onDelete]);

  if (viewMode === 'list') {
    return (
      <OptimizedListItem
        id={book.id}
        className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        onClick={handleSelect}
      >
        <LazyImage
          src={book.cover || '/default-cover.jpg'}
          alt={book.title}
          className="w-12 h-16 object-cover rounded mr-4"
          placeholder={<div className="w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded" />}
        />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {book.author}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {book.totalPages} 页 • {book.format.toUpperCase()}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="ml-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          删除
        </button>
      </OptimizedListItem>
    );
  }

  return (
    <OptimizedListItem
      id={book.id}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleSelect}
    >
      <div className="relative">
        <LazyImage
          src={book.cover || '/default-cover.jpg'}
          alt={book.title}
          className="w-full h-48 object-cover rounded-t-lg"
          placeholder={<div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />}
        />
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
          {book.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
          {book.author}
        </p>
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500">
          <span>{book.totalPages} 页</span>
          <span>{book.format.toUpperCase()}</span>
        </div>
      </div>
    </OptimizedListItem>
  );
});

export const OptimizedBookshelf = memo<OptimizedBookshelfProps>(({
  books,
  onBookSelect,
  onBookAdd,
  onDeleteBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'date'>('title');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Memory optimization
  const { addToCache, getFromCache } = useMemoryOptimization({
    maxCacheSize: 200
  });

  // Filter and sort books
  const filteredAndSortedBooks = useMemo(() => {
    const cacheKey = `books-${searchQuery}-${sortBy}`;
    let cached = getFromCache(cacheKey);
    
    if (!cached) {
      let filtered = books;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = books.filter(book =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
        );
      }
      
      // Sort books
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'author':
            return a.author.localeCompare(b.author);
          case 'date':
            return (b.importDate?.getTime() || 0) - (a.importDate?.getTime() || 0);
          default:
            return 0;
        }
      });
      
      cached = filtered;
      addToCache(cacheKey, cached);
    }
    
    return cached as BookMetadata[];
  }, [books, searchQuery, sortBy, addToCache, getFromCache]);

  // List optimization for large collections
  const {
    visibleItems,
    loadMore,
    hasMore
  } = useListOptimization(filteredAndSortedBooks, {
    chunkSize: 50,
    maxVisibleItems: 100
  });

  const handleImport = useCallback(() => {
    // Mock book import
    const mockBook: BookMetadata = {
      id: Date.now().toString(),
      title: '新导入的书籍',
      author: '作者',
      format: 'epub',
      filePath: '/path/to/book.epub',
      fileSize: 1024000,
      importDate: new Date(),
      totalPages: 200,
      language: 'zh-CN'
    };
    onBookAdd(mockBook);
  }, [onBookAdd]);

  const renderBookItem = useCallback((book: BookMetadata, index: number) => (
    <BookCard
      key={book.id}
      book={book}
      onSelect={onBookSelect}
      onDelete={onDeleteBook}
      viewMode={viewMode}
    />
  ), [onBookSelect, onDeleteBook, viewMode]);

  const itemHeight = viewMode === 'grid' ? 280 : 80;

  return (
    <div className="optimized-bookshelf h-full flex flex-col">
      {/* Header */}
      <div className="bookshelf-header p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            我的书架
          </h2>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            导入书籍
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <DebouncedInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜索书籍..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'title' | 'author' | 'date')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="title">按标题排序</option>
            <option value="author">按作者排序</option>
            <option value="date">按导入时间排序</option>
          </select>
          
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              列表
            </button>
          </div>
        </div>
      </div>

      {/* Books Grid/List */}
      <div className="bookshelf-content flex-1 p-4">
        {filteredAndSortedBooks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? '未找到匹配的书籍' : '书架为空'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? '尝试使用不同的搜索词' : '点击"导入书籍"开始添加您的电子书'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visibleItems.map((book) => renderBookItem(book, 0))}
              </div>
            ) : (
              <VirtualList
                items={visibleItems}
                itemHeight={itemHeight}
                containerHeight={600}
                renderItem={(book, index, style) => (
                  <div key={book.id} style={style}>
                    {renderBookItem(book, index)}
                  </div>
                )}
                className="h-full"
              />
            )}
            
            {hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={loadMore}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  加载更多 ({filteredAndSortedBooks.length - visibleItems.length} 本)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});