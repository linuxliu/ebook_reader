import { IPCHandlers } from '../../main/ipc/IPCHandlers';
import { DatabaseService } from '../../main/services/DatabaseService';
import { FileSystemService } from '../../main/services/FileSystemService';
import { CacheService } from '../../main/services/CacheService';
import { BookMetadata, ReadingProgress, VocabularyItem } from '../../shared/types';

// Mock Electron IPC
const mockIpcMain = {
  handle: jest.fn(),
  removeHandler: jest.fn()
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  app: {
    getPath: jest.fn(() => '/tmp/test-app')
  }
}));

// Mock services
jest.mock('../../main/services/DatabaseService');
jest.mock('../../main/services/FileSystemService');
jest.mock('../../main/services/CacheService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedFileSystemService = FileSystemService as jest.MockedClass<typeof FileSystemService>;
const MockedCacheService = CacheService as jest.MockedClass<typeof CacheService>;

describe('IPC Communication Integration', () => {
  let ipcHandlers: IPCHandlers;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockFileSystemService: jest.Mocked<FileSystemService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockFileSystemService = new MockedFileSystemService() as jest.Mocked<FileSystemService>;
    mockCacheService = new MockedCacheService() as jest.Mocked<CacheService>;
    
    ipcHandlers = new IPCHandlers(
      mockDatabaseService,
      mockFileSystemService,
      mockCacheService
    );
  });

  describe('Book Management IPC', () => {
    const mockBook: BookMetadata = {
      id: 'test-book-1',
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      filePath: '/path/to/book.epub',
      fileSize: 1024000,
      importDate: new Date('2024-01-01'),
      totalPages: 200,
      language: 'zh-CN'
    };

    it('should handle importBook IPC call', async () => {
      mockFileSystemService.importBook.mockResolvedValue(mockBook);
      mockDatabaseService.saveBook.mockResolvedValue(mockBook.id);
      
      // Simulate IPC call
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'importBook'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      const result = await handler(null, '/path/to/book.epub');
      
      expect(result).toEqual(mockBook);
      expect(mockFileSystemService.importBook).toHaveBeenCalledWith('/path/to/book.epub');
      expect(mockDatabaseService.saveBook).toHaveBeenCalledWith(mockBook);
    });

    it('should handle getBooks IPC call', async () => {
      const mockBooks = [mockBook];
      mockDatabaseService.getBooks.mockResolvedValue(mockBooks);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getBooks'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      const result = await handler(null);
      
      expect(result).toEqual(mockBooks);
      expect(mockDatabaseService.getBooks).toHaveBeenCalled();
    });

    it('should handle deleteBook IPC call', async () => {
      mockDatabaseService.deleteBook.mockResolvedValue();
      mockCacheService.invalidateCache.mockResolvedValue();
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'deleteBook'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await handler(null, 'test-book-1');
      
      expect(mockDatabaseService.deleteBook).toHaveBeenCalledWith('test-book-1');
      expect(mockCacheService.invalidateCache).toHaveBeenCalledWith('test-book-1');
    });
  });

  describe('Reading Progress IPC', () => {
    const mockProgress: ReadingProgress = {
      bookId: 'test-book-1',
      currentPage: 50,
      currentChapter: 3,
      percentage: 25,
      position: 'chapter-3-page-50',
      lastUpdateTime: new Date()
    };

    it('should handle saveProgress IPC call', async () => {
      mockDatabaseService.saveProgress.mockResolvedValue();
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'saveProgress'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await handler(null, 'test-book-1', mockProgress);
      
      expect(mockDatabaseService.saveProgress).toHaveBeenCalledWith('test-book-1', mockProgress);
    });

    it('should handle getProgress IPC call', async () => {
      mockDatabaseService.getProgress.mockResolvedValue(mockProgress);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getProgress'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      const result = await handler(null, 'test-book-1');
      
      expect(result).toEqual(mockProgress);
      expect(mockDatabaseService.getProgress).toHaveBeenCalledWith('test-book-1');
    });
  });

  describe('Vocabulary IPC', () => {
    const mockVocabulary: VocabularyItem = {
      id: 'vocab-1',
      word: 'test',
      translation: '测试',
      bookId: 'test-book-1',
      context: 'This is a test',
      addedDate: new Date(),
      mastered: false
    };

    it('should handle addVocabulary IPC call', async () => {
      mockDatabaseService.addVocabulary.mockResolvedValue();
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'addVocabulary'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await handler(null, mockVocabulary);
      
      expect(mockDatabaseService.addVocabulary).toHaveBeenCalledWith(mockVocabulary);
    });

    it('should handle getVocabulary IPC call', async () => {
      const mockVocabList = [mockVocabulary];
      mockDatabaseService.getVocabulary.mockResolvedValue(mockVocabList);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getVocabulary'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      const result = await handler(null, 'test-book-1');
      
      expect(result).toEqual(mockVocabList);
      expect(mockDatabaseService.getVocabulary).toHaveBeenCalledWith('test-book-1');
    });
  });

  describe('Cache Management IPC', () => {
    it('should handle getCacheSize IPC call', async () => {
      mockCacheService.getCacheSize.mockResolvedValue(1024000);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getCacheSize'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      const result = await handler(null);
      
      expect(result).toBe(1024000);
      expect(mockCacheService.getCacheSize).toHaveBeenCalled();
    });

    it('should handle clearCache IPC call', async () => {
      mockCacheService.clearAllCache.mockResolvedValue();
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'clearCache'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await handler(null);
      
      expect(mockCacheService.clearAllCache).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in IPC calls', async () => {
      const dbError = new Error('Database connection failed');
      mockDatabaseService.getBooks.mockRejectedValue(dbError);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getBooks'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await expect(handler(null)).rejects.toThrow('Database connection failed');
    });

    it('should handle file system errors in IPC calls', async () => {
      const fsError = new Error('File not found');
      mockFileSystemService.importBook.mockRejectedValue(fsError);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'importBook'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await expect(handler(null, '/invalid/path')).rejects.toThrow('File not found');
    });

    it('should handle cache errors in IPC calls', async () => {
      const cacheError = new Error('Cache write failed');
      mockCacheService.getCacheSize.mockRejectedValue(cacheError);
      
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getCacheSize'
      )?.[1];
      
      expect(handler).toBeDefined();
      
      await expect(handler(null)).rejects.toThrow('Cache write failed');
    });
  });

  describe('IPC Handler Registration', () => {
    it('should register all required IPC handlers', () => {
      const expectedHandlers = [
        'importBook',
        'getBooks',
        'deleteBook',
        'getBookContent',
        'saveProgress',
        'getProgress',
        'addVocabulary',
        'getVocabulary',
        'deleteVocabulary',
        'saveSettings',
        'getSettings',
        'getCacheSize',
        'clearCache',
        'translate'
      ];
      
      expectedHandlers.forEach(handlerName => {
        expect(mockIpcMain.handle).toHaveBeenCalledWith(
          handlerName,
          expect.any(Function)
        );
      });
    });

    it('should handle cleanup on shutdown', () => {
      ipcHandlers.cleanup();
      
      // Verify handlers are removed
      expect(mockIpcMain.removeHandler).toHaveBeenCalled();
    });
  });

  describe('Data Flow Integration', () => {
    it('should handle complete book import flow', async () => {
      const mockBook: BookMetadata = {
        id: 'integration-book',
        title: 'Integration Test Book',
        author: 'Test Author',
        format: 'epub',
        filePath: '/path/to/integration-book.epub',
        fileSize: 2048000,
        importDate: new Date(),
        totalPages: 300,
        language: 'zh-CN'
      };

      // Mock the complete flow
      mockFileSystemService.importBook.mockResolvedValue(mockBook);
      mockDatabaseService.saveBook.mockResolvedValue(mockBook.id);
      mockCacheService.generateCache.mockResolvedValue();

      // Execute import
      const importHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'importBook'
      )?.[1];

      const result = await importHandler(null, mockBook.filePath);

      // Verify complete flow
      expect(mockFileSystemService.importBook).toHaveBeenCalledWith(mockBook.filePath);
      expect(mockDatabaseService.saveBook).toHaveBeenCalledWith(mockBook);
      expect(result).toEqual(mockBook);
    });

    it('should handle reading session flow', async () => {
      const bookId = 'session-book';
      const mockProgress: ReadingProgress = {
        bookId,
        currentPage: 1,
        currentChapter: 0,
        percentage: 1,
        position: 'start',
        lastUpdateTime: new Date()
      };

      // Mock reading session
      mockDatabaseService.getProgress.mockResolvedValue(null); // No existing progress
      mockDatabaseService.saveProgress.mockResolvedValue();

      // Get initial progress
      const getProgressHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'getProgress'
      )?.[1];

      const initialProgress = await getProgressHandler(null, bookId);
      expect(initialProgress).toBeNull();

      // Save new progress
      const saveProgressHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'saveProgress'
      )?.[1];

      await saveProgressHandler(null, bookId, mockProgress);

      expect(mockDatabaseService.saveProgress).toHaveBeenCalledWith(bookId, mockProgress);
    });
  });
});