import { IPCClient } from '../IPCClient';
import { 
  BookMetadata, 
  ReadingProgress, 
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  ErrorType,
  IPCResponse 
} from '../../../shared/types';

// Mock window.electronAPI
const mockElectronAPI = {
  invoke: jest.fn()
};

// Setup global window mock
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('IPCClient', () => {
  let ipcClient: IPCClient;

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

  beforeEach(() => {
    jest.clearAllMocks();
    ipcClient = new IPCClient();
  });

  afterEach(() => {
    ipcClient.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully when electronAPI is available', () => {
      expect(() => new IPCClient()).not.toThrow();
    });

    it('should throw error when electronAPI is not available', () => {
      // Temporarily remove electronAPI
      const originalAPI = window.electronAPI;
      (window as any).electronAPI = undefined;

      expect(() => new IPCClient()).toThrow('Electron API not available');

      // Restore electronAPI
      window.electronAPI = originalAPI;
    });
  });

  describe('Book Management API', () => {
    it('should import book successfully', async () => {
      const successResponse: IPCResponse<BookMetadata> = {
        id: 'test-request',
        success: true,
        data: mockBook,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.importBook('/path/to/book.epub');

      expect(result).toEqual(mockBook);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'book:import',
        expect.objectContaining({
          channel: 'book:import',
          data: { filePath: '/path/to/book.epub' }
        })
      );
    });

    it('should get all books successfully', async () => {
      const successResponse: IPCResponse<BookMetadata[]> = {
        id: 'test-request',
        success: true,
        data: [mockBook],
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getAllBooks();

      expect(result).toEqual([mockBook]);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'book:get-all',
        expect.objectContaining({
          channel: 'book:get-all'
        })
      );
    });

    it('should delete book successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.deleteBook('test-book-id');

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'book:delete',
        expect.objectContaining({
          channel: 'book:delete',
          data: { bookId: 'test-book-id' }
        })
      );
    });

    it('should update book successfully', async () => {
      const updates = { title: 'Updated Title' };
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.updateBook('test-book-id', updates);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'book:update',
        expect.objectContaining({
          channel: 'book:update',
          data: { bookId: 'test-book-id', updates }
        })
      );
    });
  });

  describe('Progress Management API', () => {
    it('should save progress successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.saveProgress('test-book-id', mockProgress);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'progress:save',
        expect.objectContaining({
          channel: 'progress:save',
          data: { bookId: 'test-book-id', progress: mockProgress }
        })
      );
    });

    it('should get progress successfully', async () => {
      const successResponse: IPCResponse<ReadingProgress> = {
        id: 'test-request',
        success: true,
        data: mockProgress,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getProgress('test-book-id');

      expect(result).toEqual(mockProgress);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'progress:get',
        expect.objectContaining({
          channel: 'progress:get',
          data: { bookId: 'test-book-id' }
        })
      );
    });
  });

  describe('Vocabulary Management API', () => {
    it('should add vocabulary successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.addVocabulary(mockVocabularyItem);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'vocabulary:add',
        expect.objectContaining({
          channel: 'vocabulary:add',
          data: { word: mockVocabularyItem }
        })
      );
    });

    it('should get vocabulary successfully', async () => {
      const successResponse: IPCResponse<VocabularyItem[]> = {
        id: 'test-request',
        success: true,
        data: [mockVocabularyItem],
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getVocabulary('test-book-id');

      expect(result).toEqual([mockVocabularyItem]);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'vocabulary:get',
        expect.objectContaining({
          channel: 'vocabulary:get',
          data: { bookId: 'test-book-id' }
        })
      );
    });

    it('should export vocabulary successfully', async () => {
      const successResponse: IPCResponse<{ filePath: string }> = {
        id: 'test-request',
        success: true,
        data: { filePath: '/path/to/export.csv' },
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.exportVocabulary('csv', 'test-book-id');

      expect(result).toBe('/path/to/export.csv');
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'vocabulary:export',
        expect.objectContaining({
          channel: 'vocabulary:export',
          data: { format: 'csv', bookId: 'test-book-id' }
        })
      );
    });

    it('should mark word as mastered successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.markWordAsMastered('test-word-id', true);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'vocabulary:mark-mastered',
        expect.objectContaining({
          channel: 'vocabulary:mark-mastered',
          data: { wordId: 'test-word-id', mastered: true }
        })
      );
    });
  });

  describe('Settings Management API', () => {
    it('should save reading settings successfully', async () => {
      const settings: ReadingSettings = {
        bookId: 'test-book-id',
        fontFamily: 'Arial',
        fontSize: 16,
        lineHeight: 1.5,
        margin: 20,
        theme: 'light',
        pageMode: 'scroll'
      };

      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.saveSettings('test-book-id', settings);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'settings:save',
        expect.objectContaining({
          channel: 'settings:save',
          data: { bookId: 'test-book-id', settings }
        })
      );
    });

    it('should get app settings successfully', async () => {
      const appSettings: AppSettings = {
        theme: 'system',
        language: 'zh-CN',
        autoSave: true,
        cacheSize: 500
      };

      const successResponse: IPCResponse<AppSettings> = {
        id: 'test-request',
        success: true,
        data: appSettings,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getAppSettings();

      expect(result).toEqual(appSettings);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'settings:get-app',
        expect.objectContaining({
          channel: 'settings:get-app'
        })
      );
    });
  });

  describe('Translation API', () => {
    it('should translate text successfully', async () => {
      const translationResult = {
        word: 'test',
        translation: '测试',
        pronunciation: '/test/',
        examples: ['This is a test.'],
        definitions: ['A procedure for testing something.'],
        source: 'online' as const
      };

      const successResponse: IPCResponse<typeof translationResult> = {
        id: 'test-request',
        success: true,
        data: translationResult,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.translate('test', 'en', 'zh-CN');

      expect(result).toEqual(translationResult);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'translation:translate',
        expect.objectContaining({
          channel: 'translation:translate',
          data: { text: 'test', from: 'en', to: 'zh-CN' }
        })
      );
    });
  });

  describe('App Management API', () => {
    it('should get app version successfully', async () => {
      const successResponse: IPCResponse<string> = {
        id: 'test-request',
        success: true,
        data: '1.0.0',
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getAppVersion();

      expect(result).toBe('1.0.0');
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'app:get-version',
        expect.objectContaining({
          channel: 'app:get-version'
        })
      );
    });

    it('should quit app successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.quitApp();

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'app:quit',
        expect.objectContaining({
          channel: 'app:quit'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle IPC errors properly', async () => {
      const errorResponse: IPCResponse<never> = {
        id: 'test-request',
        success: false,
        error: {
          type: ErrorType.DATABASE_ERROR,
          message: 'Database connection failed',
          timestamp: new Date(),
          recoverable: true
        },
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(errorResponse);

      await expect(ipcClient.getAllBooks()).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR,
        message: 'Database connection failed'
      });
    });

    it('should handle network errors', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('Network error'));

      await expect(ipcClient.getAllBooks()).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error'
      });
    });

    it('should handle timeout errors', async () => {
      // Mock a request that never resolves
      mockElectronAPI.invoke.mockImplementation(() => new Promise(() => {}));

      // Set a shorter timeout for testing
      const originalTimeout = (ipcClient as any).defaultTimeout;
      (ipcClient as any).defaultTimeout = 100;

      await expect(ipcClient.getAllBooks()).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        message: '请求超时'
      });

      // Restore original timeout
      (ipcClient as any).defaultTimeout = originalTimeout;
    }, 1000);
  });

  describe('Request Management', () => {
    it('should generate unique request IDs', async () => {
      const successResponse: IPCResponse<BookMetadata[]> = {
        id: 'test-request',
        success: true,
        data: [],
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      // Make multiple requests
      await Promise.all([
        ipcClient.getAllBooks(),
        ipcClient.getAllBooks(),
        ipcClient.getAllBooks()
      ]);

      // Check that each call had a unique request ID
      const calls = mockElectronAPI.invoke.mock.calls;
      const requestIds = calls.map(call => call[1].id);
      const uniqueIds = new Set(requestIds);

      expect(uniqueIds.size).toBe(calls.length);
    });

    it('should cleanup pending requests', () => {
      // Start a request that won't resolve
      mockElectronAPI.invoke.mockImplementation(() => new Promise(() => {}));
      
      const promise = ipcClient.getAllBooks();
      
      // Cleanup should reject pending requests
      ipcClient.cleanup();
      
      expect(promise).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        message: 'IPC client is being cleaned up'
      });
    });
  });

  describe('Cache Management API', () => {
    it('should get cache size successfully', async () => {
      const successResponse: IPCResponse<number> = {
        id: 'test-request',
        success: true,
        data: 1024000,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      const result = await ipcClient.getCacheSize();

      expect(result).toBe(1024000);
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'cache:get-size',
        expect.objectContaining({
          channel: 'cache:get-size'
        })
      );
    });

    it('should cleanup cache successfully', async () => {
      const successResponse: IPCResponse<void> = {
        id: 'test-request',
        success: true,
        timestamp: Date.now()
      };

      mockElectronAPI.invoke.mockResolvedValue(successResponse);

      await ipcClient.cleanupCache();

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'cache:cleanup',
        expect.objectContaining({
          channel: 'cache:cleanup'
        })
      );
    });
  });
});