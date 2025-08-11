import React, { useEffect, useState } from 'react';
import { useCurrentView, useBooks, useAppSettings, useLoading, useError } from './store';
import {
  LazyBookshelf,
  LazyReader,
  LazyVocabulary,
  LazySettings
} from './components/LazyComponents';
import {
  ThemeProvider,
  ThemeToggle,
  ErrorBoundary,
  ErrorAndLoadingManager
} from './components/common';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { useStartupOptimization } from './hooks/useStartupOptimization';
import { useMemoryMonitor } from './services/MemoryMonitor';
import { BookMetadata, BookContent, ReadingProgress, ReadingSettings } from '../shared/types';

const App: React.FC = () => {

  const [currentBook, setCurrentBook] = useState<BookMetadata | null>(null);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [readingSettings, setReadingSettings] = useState<ReadingSettings | null>(null);

  // Use state management hooks
  const { currentView, setCurrentView } = useCurrentView();
  const { books, setBooks } = useBooks();
  const { loading } = useLoading();
  const { error, hasError, clearError } = useError();

  // Use startup optimization
  const { isOptimizing } = useStartupOptimization();

  // Use memory monitoring
  const { memoryStats, triggerCleanup } = useMemoryMonitor();

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Test the IPC communication
        const appVersion = await window.electronAPI.getVersion();
        const appPlatform = await window.electronAPI.getPlatform();
        console.log('App initialized:', { version: appVersion, platform: appPlatform });
        
        // Load books from database
        const { IPCClient } = await import('./services/IPCClient');
        const ipcClient = new IPCClient();
        const allBooks = await ipcClient.getAllBooks();
        console.log('Loaded books:', allBooks);
        
        // Update books state
        setBooks(allBooks);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [setBooks]);

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
  };

  const handleBookSelect = async (book: BookMetadata) => {
    console.log('Selected book:', book);
    try {
      // Load book content and progress
      setCurrentBook(book);
      setCurrentView('reader');

      // Mock data for now - in real implementation, load from IPC
      const mockContent: BookContent = {
        bookId: book.id,
        chapters: [
          {
            id: 'chapter-1',
            title: '第一章',
            content: '<p>这是第一章的内容。在这里我们开始了一个精彩的故事...</p><p>故事继续发展，主人公遇到了各种挑战和机遇。</p>',
            pageCount: Math.floor(book.totalPages / 2),
            startPage: 1
          },
          {
            id: 'chapter-2',
            title: '第二章',
            content: '<p>第二章带来了新的转折。情节变得更加复杂和有趣...</p><p>随着故事的深入，我们看到了更多的细节和发展。</p>',
            pageCount: Math.ceil(book.totalPages / 2),
            startPage: Math.floor(book.totalPages / 2) + 1
          }
        ],
        toc: [
          { id: 'toc-1', title: '第一章', level: 1, page: 1 },
          { id: 'toc-2', title: '第二章', level: 1, page: Math.floor(book.totalPages / 2) + 1 }
        ],
        rawContent: '原始内容...'
      };

      const mockProgress: ReadingProgress = {
        bookId: book.id,
        currentPage: 1,
        currentChapter: 0,
        percentage: 1,
        position: 'page-1',
        lastUpdateTime: new Date()
      };

      const mockSettings: ReadingSettings = {
        bookId: book.id,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 16,
        lineHeight: 1.6,
        margin: 40,
        theme: 'light',
        pageMode: 'pagination'
      };

      setBookContent(mockContent);
      setReadingProgress(mockProgress);
      setReadingSettings(mockSettings);

    } catch (error) {
      console.error('Failed to load book:', error);
    }
  };

  const handleBookAdd = (book: BookMetadata) => {
    console.log('Book added:', book);
    // 添加到本地状态中
    const updatedBooks = [...books, book];
    setBooks(updatedBooks);
  };

  const handleDeleteBook = async (bookId: string) => {
    console.log('Delete book:', bookId);
    try {
      // 调用IPC删除书籍
      const { IPCClient } = await import('./services/IPCClient');
      const ipcClient = new IPCClient();
      await ipcClient.deleteBook(bookId);
      
      // 从本地状态中移除书籍
      const updatedBooks = books.filter(book => book.id !== bookId);
      setBooks(updatedBooks);
      
      console.log('Book deleted successfully:', bookId);
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  const handleCloseReader = () => {
    setCurrentView('bookshelf');
    setCurrentBook(null);
    setBookContent(null);
    setReadingProgress(null);
    setReadingSettings(null);
  };

  const handleProgressChange = (progress: ReadingProgress) => {
    setReadingProgress(progress);
    // TODO: Save progress to database via IPC
    console.log('Progress updated:', progress);
  };

  const handleSettingsChange = (settings: ReadingSettings) => {
    setReadingSettings(settings);
    // TODO: Save settings to database via IPC
    console.log('Settings updated:', settings);
  };

  return (
    <ErrorProvider>
      <LoadingProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex-1"></div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                      电子书阅读器
                    </h1>
                    <div className="flex-1 flex justify-end">
                      <ThemeToggle />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    基于 Electron + React + TypeScript 构建
                  </p>
                </header>

                {/* Error Display */}
                {hasError && error && (
                  <div className="max-w-2xl mx-auto mb-6">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-red-800 dark:text-red-200 font-medium">
                            错误
                          </h3>
                          <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                            {error.message}
                          </p>
                        </div>
                        <button
                          onClick={clearError}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Indicator */}
                {(loading || isOptimizing) && (
                  <div className="max-w-2xl mx-auto mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
                          <span className="text-blue-800 dark:text-blue-200">
                            {isOptimizing ? '优化启动性能中...' : '加载中...'}
                          </span>
                        </div>
                        {memoryStats && memoryStats.usagePercentage > 70 && (
                          <button
                            onClick={triggerCleanup}
                            className="text-xs px-2 py-1 bg-yellow-500 text-white rounded ml-4"
                          >
                            内存清理 ({memoryStats.usagePercentage.toFixed(1)}%)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <main className="flex-1 flex flex-col">
                  {/* Navigation */}
                  <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <nav className="flex space-x-4">
                      {(['bookshelf', 'reader', 'vocabulary', 'settings'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => handleViewChange(view)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === view
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {view === 'bookshelf' && '书架'}
                          {view === 'reader' && '阅读器'}
                          {view === 'vocabulary' && '生词表'}
                          {view === 'settings' && '设置'}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1">
                    {currentView === 'bookshelf' && (
                      <LazyBookshelf
                        books={books}
                        onBookSelect={handleBookSelect}
                        onBookAdd={handleBookAdd}
                        onDeleteBook={handleDeleteBook}
                      />
                    )}

                    {currentView === 'reader' && currentBook && bookContent && readingProgress && readingSettings && (
                      <LazyReader
                        book={currentBook}
                        content={bookContent}
                        progress={readingProgress}
                        settings={readingSettings}
                        onProgressChange={handleProgressChange}
                        onSettingsChange={handleSettingsChange}
                        onClose={handleCloseReader}
                      />
                    )}

                    {currentView === 'reader' && (!currentBook || !bookContent) && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-6xl mb-4">📖</div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            请选择一本书开始阅读
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            从书架中选择一本书来开始您的阅读之旅
                          </p>
                        </div>
                      </div>
                    )}

                    {currentView === 'vocabulary' && (
                      <LazyVocabulary />
                    )}

                    {currentView === 'settings' && (
                      <LazySettings
                        settings={{
                          bookId: '',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: 16,
                          lineHeight: 1.6,
                          margin: 40,
                          theme: 'light',
                          pageMode: 'pagination'
                        }}
                        onSettingsChange={() => { }}
                        onClose={() => setCurrentView('bookshelf')}
                      />
                    )}
                  </div>
                </main>
              </div>

              {/* Error and Loading Manager */}
              <ErrorAndLoadingManager />
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </LoadingProvider>
    </ErrorProvider>
  );
};

export default App;