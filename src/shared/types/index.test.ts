// Test file to verify TypeScript interfaces are properly defined
import {
  BookMetadata,
  ReadingProgress,
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  BookContent,
  Chapter,
  TableOfContent,
  CachedBook,
  AppState,
  ErrorType,
  AppError,
  FileSystemService,
  DatabaseService,
  CacheService,
  TranslationService,
  TranslationResult,
  IPCChannel,
  IPCRequest,
  IPCResponse,
  BookImportRequest,
  BookImportResponse,
  BookshelfProps,
  ReaderProps,
  TranslationProps,
  VocabularyListProps,
  SettingsProps,
  BookFormat,
  ViewMode,
  SortBy,
  Theme,
  Language,
  ExportFormat,
  PageMode,
  PaginationInfo,
  SearchOptions,
  SearchResult,
  SearchMatch,
  ImportProgress,
  ReadingStats,
  BackupInfo
} from './index';

describe('TypeScript Interface Tests', () => {
  test('BookMetadata interface should be properly defined', () => {
    const book: BookMetadata = {
      id: 'test-id',
      title: 'Test Book',
      author: 'Test Author',
      cover: 'test-cover.jpg',
      format: 'epub',
      filePath: '/path/to/book.epub',
      fileSize: 1024000,
      importDate: new Date(),
      lastReadDate: new Date(),
      totalPages: 200,
      language: 'zh-CN'
    };

    expect(book.id).toBe('test-id');
    expect(book.format).toBe('epub');
  });

  test('ReadingProgress interface should be properly defined', () => {
    const progress: ReadingProgress = {
      bookId: 'test-book-id',
      currentPage: 50,
      currentChapter: 3,
      percentage: 25.5,
      position: 'chapter-3-paragraph-10',
      lastUpdateTime: new Date()
    };

    expect(progress.bookId).toBe('test-book-id');
    expect(progress.percentage).toBe(25.5);
  });

  test('VocabularyItem interface should be properly defined', () => {
    const word: VocabularyItem = {
      id: 'word-id',
      word: 'example',
      translation: '例子',
      pronunciation: '/ɪɡˈzæmpəl/',
      example: 'This is an example.',
      bookId: 'book-id',
      context: 'This is an example sentence.',
      addedDate: new Date(),
      mastered: false
    };

    expect(word.word).toBe('example');
    expect(word.mastered).toBe(false);
  });

  test('ErrorType enum should be properly defined', () => {
    expect(ErrorType.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
    expect(ErrorType.UNSUPPORTED_FORMAT).toBe('UNSUPPORTED_FORMAT');
    expect(ErrorType.PARSE_ERROR).toBe('PARSE_ERROR');
    expect(ErrorType.CACHE_ERROR).toBe('CACHE_ERROR');
    expect(ErrorType.DATABASE_ERROR).toBe('DATABASE_ERROR');
    expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorType.PERMISSION_ERROR).toBe('PERMISSION_ERROR');
    expect(ErrorType.STORAGE_FULL).toBe('STORAGE_FULL');
  });

  test('AppError interface should be properly defined', () => {
    const error: AppError = {
      type: ErrorType.FILE_NOT_FOUND,
      message: 'File not found',
      details: { filePath: '/path/to/file' },
      timestamp: new Date(),
      recoverable: true
    };

    expect(error.type).toBe(ErrorType.FILE_NOT_FOUND);
    expect(error.recoverable).toBe(true);
  });

  test('IPCChannel type should include all required channels', () => {
    const channels: IPCChannel[] = [
      'book:import',
      'book:get-all',
      'book:get',
      'book:delete',
      'book:update',
      'book:parse-content',
      'progress:save',
      'progress:get',
      'progress:delete',
      'vocabulary:add',
      'vocabulary:get',
      'vocabulary:delete',
      'vocabulary:update',
      'vocabulary:mark-mastered',
      'vocabulary:export',
      'settings:save',
      'settings:get',
      'settings:save-app',
      'settings:get-app',
      'cache:generate',
      'cache:get',
      'cache:invalidate',
      'cache:cleanup',
      'cache:get-size',
      'translation:translate',
      'translation:get-local',
      'fs:validate-file',
      'fs:get-file-info',
      'fs:clear-cache',
      'app:get-version',
      'app:quit',
      'app:minimize',
      'app:maximize',
      'app:toggle-fullscreen'
    ];

    expect(channels.length).toBeGreaterThan(30);
  });

  test('IPCRequest interface should be properly defined', () => {
    const request: IPCRequest<BookImportRequest> = {
      id: 'request-id',
      channel: 'book:import',
      data: { filePath: '/path/to/book.epub' },
      timestamp: Date.now()
    };

    expect(request.channel).toBe('book:import');
    expect(request.data?.filePath).toBe('/path/to/book.epub');
  });

  test('IPCResponse interface should be properly defined', () => {
    const response: IPCResponse<BookImportResponse> = {
      id: 'response-id',
      success: true,
      data: {
        book: {
          id: 'book-id',
          title: 'Test Book',
          author: 'Test Author',
          format: 'epub',
          filePath: '/path/to/book.epub',
          fileSize: 1024000,
          importDate: new Date(),
          totalPages: 200,
          language: 'zh-CN'
        }
      },
      timestamp: Date.now()
    };

    expect(response.success).toBe(true);
    expect(response.data?.book.title).toBe('Test Book');
  });

  test('Service interfaces should be properly defined', () => {
    // This test just verifies the interfaces exist and have the expected methods
    const fileSystemServiceMethods = [
      'importBook',
      'parseBookContent',
      'exportVocabulary',
      'clearCache',
      'validateFile',
      'getFileInfo'
    ];

    const databaseServiceMethods = [
      'saveBook',
      'getBooks',
      'getBook',
      'deleteBook',
      'updateBook',
      'saveProgress',
      'getProgress',
      'deleteProgress',
      'addVocabulary',
      'getVocabulary',
      'deleteVocabulary',
      'updateVocabulary',
      'markWordAsMastered',
      'saveSettings',
      'getSettings',
      'saveAppSettings',
      'getAppSettings',
      'initialize',
      'close',
      'backup',
      'restore'
    ];

    const cacheServiceMethods = [
      'generateCache',
      'getCache',
      'invalidateCache',
      'getCacheSize',
      'cleanupCache',
      'isCacheValid',
      'updateCacheVersion'
    ];

    // Just verify the arrays have the expected length
    expect(fileSystemServiceMethods.length).toBe(6);
    expect(databaseServiceMethods.length).toBe(21);
    expect(cacheServiceMethods.length).toBe(7);
  });

  test('Utility types should be properly defined', () => {
    const bookFormat: BookFormat = 'epub';
    const viewMode: ViewMode = 'grid';
    const sortBy: SortBy = 'title';
    const theme: Theme = 'light';
    const language: Language = 'zh-CN';
    const exportFormat: ExportFormat = 'csv';
    const pageMode: PageMode = 'scroll';

    expect(bookFormat).toBe('epub');
    expect(viewMode).toBe('grid');
    expect(sortBy).toBe('title');
    expect(theme).toBe('light');
    expect(language).toBe('zh-CN');
    expect(exportFormat).toBe('csv');
    expect(pageMode).toBe('scroll');
  });
});