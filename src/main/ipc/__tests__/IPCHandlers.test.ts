import { ipcMain } from 'electron';
import { IPCHandlers } from '../IPCHandlers';
import { DatabaseService } from '../../services/DatabaseService';
import { FileSystemService } from '../../services/FileSystemService';
import { CacheService } from '../../services/CacheService';
import { 
  IPCRequest, 
  BookMetadata, 
  ReadingProgress, 
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  ErrorType 
} from '../../../shared/types';

// Mock Electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  },
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    quit: jest.fn()
  },
  BrowserWindow: {
    getFocusedWindow: jest.fn()
  }
}));

// Mock services
jest.mock('../../services/DatabaseService');
jest.mock('../../services/FileSystemService');
jest.mock('../../services/CacheService');

describe('IPCHandlers', () => {
  let ipcHandlers: IPCHandlers;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockFileSystemService: jest.Mocked<FileSystemService>;
  let mockCacheService: jest.Mocked<CacheService>;

  const mockBook: BookMetadata = {
    id: 'test-book-id',
    title: 'Test Book',
    author: 'Test Author',
    format: 'epub',
    filePath: '/path/to/book.epub',
    fileSize: 1024000,
    importDate: new Date(),
    totalPages: 100,
    language: 'zh-CN'
  };

  const mockProgress: ReadingProgress = {
    bookId: 'test-book-id',
    currentPage: 50,
    currentChapter: 5,
    percentage: 50,
    position: 'chapter-5-page-50',
    lastUpdateTime: new Date()
  };

  const mockVocabularyItem: VocabularyItem = {
    id: 'test-word-id',
    word: 'test',
    translation: '测试',
    bookId: 'test-book-id',
    context: 'This is a test word.',
    addedDate: new Date(),
    mastered: false
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup service mocks
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockFileSystemService = new FileSystemService() as jest.Mocked<FileSystemService>;
    mockCacheService = new CacheService() as jest.Mocked<CacheService>;

    // Mock service methods
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.close.mockResolvedValue();
    
    ipcHandlers = new IPCHandlers();
    
    // Replace the services with mocks
    (ipcHandlers as any).databaseService = mockDatabaseService;
    (ipcHandlers as any).fileSystemService = mockFileSystemService;
    (ipcHandlers as any).cacheService = mockCacheService;
    
    await ipcHandlers.initialize();
  });

  afterEach(async () => {
    await ipcHandlers.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(mockDatabaseService.initialize).toHaveBeenCalled();
      expect(ipcMain.handle).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
    });

    it('should cleanup properly', async () => {
      await ipcHandlers.cleanup();
      expect(mockDatabaseService.close).toHaveBeenCalled();
    });
  });

  describe('Book Management Handlers', () => {
    it('should handle book import', async () => {
      const request: IPCRequest = {
        id: 'test-request-1',
        channel: 'book:import',
        data: { filePath: '/path/to/book.epub' },
        timestamp: Date.now()
      };

      mockFileSystemService.importBook.mockResolvedValue(mockBook);
      mockDatabaseService.saveBook.mockResolvedValue('test-book-id');

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const importHandler = handlers.find(call => call[0] === 'book:import')[1];
      
      const response = await importHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data.book).toEqual(mockBook);
      expect(mockFileSystemService.importBook).toHaveBeenCalledWith('/path/to/book.epub');
      expect(mockDatabaseService.saveBook).toHaveBeenCalledWith(mockBook);
    });

    it('should handle get all books', async () => {
      const request: IPCRequest = {
        id: 'test-request-2',
        channel: 'book:get-all',
        timestamp: Date.now()
      };

      mockDatabaseService.getBooks.mockResolvedValue([mockBook]);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getAllHandler = handlers.find(call => call[0] === 'book:get-all')[1];
      
      const response = await getAllHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual([mockBook]);
      expect(mockDatabaseService.getBooks).toHaveBeenCalled();
    });

    it('should handle book deletion', async () => {
      const request: IPCRequest = {
        id: 'test-request-3',
        channel: 'book:delete',
        data: { bookId: 'test-book-id' },
        timestamp: Date.now()
      };

      mockDatabaseService.deleteBook.mockResolvedValue();
      mockCacheService.invalidateCache.mockResolvedValue();
      mockFileSystemService.clearCache.mockResolvedValue();

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const deleteHandler = handlers.find(call => call[0] === 'book:delete')[1];
      
      const response = await deleteHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(mockDatabaseService.deleteBook).toHaveBeenCalledWith('test-book-id');
      expect(mockCacheService.invalidateCache).toHaveBeenCalledWith('test-book-id');
      expect(mockFileSystemService.clearCache).toHaveBeenCalledWith('test-book-id');
    });
  });

  describe('Progress Handlers', () => {
    it('should handle save progress', async () => {
      const request: IPCRequest = {
        id: 'test-request-4',
        channel: 'progress:save',
        data: { bookId: 'test-book-id', progress: mockProgress },
        timestamp: Date.now()
      };

      mockDatabaseService.saveProgress.mockResolvedValue();

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const saveProgressHandler = handlers.find(call => call[0] === 'progress:save')[1];
      
      const response = await saveProgressHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(mockDatabaseService.saveProgress).toHaveBeenCalledWith('test-book-id', mockProgress);
    });

    it('should handle get progress', async () => {
      const request: IPCRequest = {
        id: 'test-request-5',
        channel: 'progress:get',
        data: { bookId: 'test-book-id' },
        timestamp: Date.now()
      };

      mockDatabaseService.getProgress.mockResolvedValue(mockProgress);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getProgressHandler = handlers.find(call => call[0] === 'progress:get')[1];
      
      const response = await getProgressHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockProgress);
      expect(mockDatabaseService.getProgress).toHaveBeenCalledWith('test-book-id');
    });
  });

  describe('Vocabulary Handlers', () => {
    it('should handle add vocabulary', async () => {
      const request: IPCRequest = {
        id: 'test-request-6',
        channel: 'vocabulary:add',
        data: { word: mockVocabularyItem },
        timestamp: Date.now()
      };

      mockDatabaseService.addVocabulary.mockResolvedValue();

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const addVocabularyHandler = handlers.find(call => call[0] === 'vocabulary:add')[1];
      
      const response = await addVocabularyHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(mockDatabaseService.addVocabulary).toHaveBeenCalledWith(mockVocabularyItem);
    });

    it('should handle get vocabulary', async () => {
      const request: IPCRequest = {
        id: 'test-request-7',
        channel: 'vocabulary:get',
        data: { bookId: 'test-book-id' },
        timestamp: Date.now()
      };

      mockDatabaseService.getVocabulary.mockResolvedValue([mockVocabularyItem]);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getVocabularyHandler = handlers.find(call => call[0] === 'vocabulary:get')[1];
      
      const response = await getVocabularyHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual([mockVocabularyItem]);
      expect(mockDatabaseService.getVocabulary).toHaveBeenCalledWith('test-book-id');
    });

    it('should handle vocabulary export', async () => {
      const request: IPCRequest = {
        id: 'test-request-8',
        channel: 'vocabulary:export',
        data: { format: 'csv', bookId: 'test-book-id' },
        timestamp: Date.now()
      };

      mockDatabaseService.getVocabulary.mockResolvedValue([mockVocabularyItem]);
      mockFileSystemService.exportVocabulary.mockResolvedValue('/path/to/export.csv');

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const exportHandler = handlers.find(call => call[0] === 'vocabulary:export')[1];
      
      const response = await exportHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data.filePath).toBe('/path/to/export.csv');
      expect(mockDatabaseService.getVocabulary).toHaveBeenCalledWith('test-book-id');
      expect(mockFileSystemService.exportVocabulary).toHaveBeenCalledWith('csv', [mockVocabularyItem]);
    });
  });

  describe('Settings Handlers', () => {
    it('should handle save reading settings', async () => {
      const settings: ReadingSettings = {
        bookId: 'test-book-id',
        fontFamily: 'Arial',
        fontSize: 16,
        lineHeight: 1.5,
        margin: 20,
        theme: 'light',
        pageMode: 'scroll'
      };

      const request: IPCRequest = {
        id: 'test-request-9',
        channel: 'settings:save',
        data: { bookId: 'test-book-id', settings },
        timestamp: Date.now()
      };

      mockDatabaseService.saveSettings.mockResolvedValue();

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const saveSettingsHandler = handlers.find(call => call[0] === 'settings:save')[1];
      
      const response = await saveSettingsHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(mockDatabaseService.saveSettings).toHaveBeenCalledWith('test-book-id', settings);
    });

    it('should handle get app settings', async () => {
      const appSettings: AppSettings = {
        theme: 'system',
        language: 'zh-CN',
        autoSave: true,
        cacheSize: 500
      };

      const request: IPCRequest = {
        id: 'test-request-10',
        channel: 'settings:get-app',
        timestamp: Date.now()
      };

      mockDatabaseService.getAppSettings.mockResolvedValue(appSettings);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getAppSettingsHandler = handlers.find(call => call[0] === 'settings:get-app')[1];
      
      const response = await getAppSettingsHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(appSettings);
      expect(mockDatabaseService.getAppSettings).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors properly', async () => {
      const request: IPCRequest = {
        id: 'test-request-error',
        channel: 'book:get-all',
        timestamp: Date.now()
      };

      const serviceError = new Error('Database connection failed');
      mockDatabaseService.getBooks.mockRejectedValue(serviceError);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getAllHandler = handlers.find(call => call[0] === 'book:get-all')[1];
      
      const response = await getAllHandler(null, request);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Database connection failed');
    });

    it('should handle timeout errors', async () => {
      const request: IPCRequest = {
        id: 'test-request-timeout',
        channel: 'book:get-all',
        timestamp: Date.now()
      };

      // Mock a long-running operation
      mockDatabaseService.getBooks.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds, longer than timeout
      );

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getAllHandler = handlers.find(call => call[0] === 'book:get-all')[1];
      
      const response = await getAllHandler(null, request);
      
      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.NETWORK_ERROR);
      expect(response.error?.message).toContain('请求超时');
    }, 40000); // Increase test timeout
  });

  describe('Cache Handlers', () => {
    it('should handle cache operations', async () => {
      const request: IPCRequest = {
        id: 'test-request-cache',
        channel: 'cache:get-size',
        timestamp: Date.now()
      };

      mockCacheService.getCacheSize.mockResolvedValue(1024000);

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getCacheSizeHandler = handlers.find(call => call[0] === 'cache:get-size')[1];
      
      const response = await getCacheSizeHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toBe(1024000);
      expect(mockCacheService.getCacheSize).toHaveBeenCalled();
    });
  });

  describe('App Management Handlers', () => {
    it('should handle get app version', async () => {
      const request: IPCRequest = {
        id: 'test-request-version',
        channel: 'app:get-version',
        timestamp: Date.now()
      };

      const handlers = (ipcMain.handle as jest.Mock).mock.calls;
      const getVersionHandler = handlers.find(call => call[0] === 'app:get-version')[1];
      
      const response = await getVersionHandler(null, request);
      
      expect(response.success).toBe(true);
      expect(response.data).toBe('1.0.0');
    });
  });
});