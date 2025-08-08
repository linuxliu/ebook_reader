import { StartupOptimizer } from '../StartupOptimizer';
import { DatabaseService } from '../DatabaseService';
import { CacheService } from '../CacheService';
import { BookMetadata } from '../../../shared/types';

// Mock dependencies
jest.mock('../DatabaseService');
jest.mock('../CacheService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedCacheService = CacheService as jest.MockedClass<typeof CacheService>;

describe('StartupOptimizer', () => {
  let startupOptimizer: StartupOptimizer;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockCacheService = new MockedCacheService() as jest.Mocked<CacheService>;
    
    startupOptimizer = new StartupOptimizer(mockDatabaseService, mockCacheService);
  });

  describe('optimizeStartup', () => {
    const mockBooks: BookMetadata[] = [
      {
        id: 'book-1',
        title: 'Recent Book 1',
        author: 'Author 1',
        format: 'epub',
        filePath: '/path/to/book1.epub',
        fileSize: 1024000,
        importDate: new Date('2024-01-01'),
        lastReadDate: new Date('2024-01-10'),
        totalPages: 200,
        language: 'zh-CN'
      },
      {
        id: 'book-2',
        title: 'Recent Book 2',
        author: 'Author 2',
        format: 'pdf',
        filePath: '/path/to/book2.pdf',
        fileSize: 2048000,
        importDate: new Date('2024-01-02'),
        lastReadDate: new Date('2024-01-09'),
        totalPages: 300,
        language: 'zh-CN'
      }
    ];

    it('should optimize startup successfully', async () => {
      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(mockBooks);
      mockCacheService.hasCache.mockResolvedValue(true);
      mockCacheService.preloadCache.mockResolvedValue();

      const result = await startupOptimizer.optimizeStartup();

      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('dbInitTime');
      expect(result).toHaveProperty('cachePrewarmTime');
      expect(result).toHaveProperty('totalStartupTime');
      expect(result).toHaveProperty('recentBooksLoaded');
      expect(result.recentBooksLoaded).toBe(2);
      expect(mockDatabaseService.initialize).toHaveBeenCalled();
    });

    it('should handle database initialization failure', async () => {
      mockDatabaseService.initialize.mockRejectedValue(new Error('Database error'));

      await expect(startupOptimizer.optimizeStartup()).rejects.toThrow('Database error');
    });

    it('should handle cache prewarming failure gracefully', async () => {
      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockRejectedValue(new Error('Books error'));

      // Should not throw, cache prewarming failures are handled gracefully
      const result = await startupOptimizer.optimizeStartup();

      expect(result).toHaveProperty('totalStartupTime');
      expect(result.recentBooksLoaded).toBe(0);
    });

    it('should handle books without lastReadDate', async () => {
      const booksWithoutReadDate = [
        { ...mockBooks[0], lastReadDate: undefined },
        mockBooks[1]
      ];

      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(booksWithoutReadDate);
      mockCacheService.hasCache.mockResolvedValue(true);
      mockCacheService.preloadCache.mockResolvedValue();

      const result = await startupOptimizer.optimizeStartup();

      expect(result.recentBooksLoaded).toBe(1); // Only books with lastReadDate
    });

    it('should limit recent books to 5', async () => {
      const manyBooks = Array.from({ length: 10 }, (_, i) => ({
        ...mockBooks[0],
        id: `book-${i}`,
        title: `Book ${i}`,
        lastReadDate: new Date(`2024-01-${10 - i}`)
      }));

      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(manyBooks);
      mockCacheService.hasCache.mockResolvedValue(true);
      mockCacheService.preloadCache.mockResolvedValue();

      const result = await startupOptimizer.optimizeStartup();

      expect(result.recentBooksLoaded).toBe(5); // Limited to 5
    });

    it('should handle cache preload timeout', async () => {
      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(mockBooks);
      mockCacheService.hasCache.mockResolvedValue(true);
      // Simulate slow cache preload
      mockCacheService.preloadCache.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 3000))
      );

      const result = await startupOptimizer.optimizeStartup();

      // Should complete despite slow cache preload due to timeout
      expect(result).toHaveProperty('totalStartupTime');
      expect(result.totalStartupTime).toBeLessThan(5000); // Should timeout before 5s
    });

    it('should skip cache preload for books without cache', async () => {
      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(mockBooks);
      mockCacheService.hasCache.mockResolvedValue(false);

      const result = await startupOptimizer.optimizeStartup();

      expect(result.recentBooksLoaded).toBe(2);
      expect(mockCacheService.preloadCache).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return startup metrics', () => {
      const metrics = startupOptimizer.getMetrics();

      expect(metrics).toHaveProperty('startTime');
      expect(metrics).toHaveProperty('dbInitTime');
      expect(metrics).toHaveProperty('cachePrewarmTime');
      expect(metrics).toHaveProperty('totalStartupTime');
      expect(metrics).toHaveProperty('recentBooksLoaded');
    });

    it('should return updated metrics after optimization', async () => {
      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue([]);

      await startupOptimizer.optimizeStartup();
      
      const metrics = startupOptimizer.getMetrics();
      
      expect(metrics.dbInitTime).toBeGreaterThan(0);
      expect(metrics.totalStartupTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await expect(startupOptimizer.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle individual cache preload failures', async () => {
      const mockBooks: BookMetadata[] = [
        {
          id: 'book-1',
          title: 'Book 1',
          author: 'Author 1',
          format: 'epub',
          filePath: '/path/to/book1.epub',
          fileSize: 1024000,
          importDate: new Date('2024-01-01'),
          lastReadDate: new Date('2024-01-10'),
          totalPages: 200,
          language: 'zh-CN'
        },
        {
          id: 'book-2',
          title: 'Book 2',
          author: 'Author 2',
          format: 'pdf',
          filePath: '/path/to/book2.pdf',
          fileSize: 2048000,
          importDate: new Date('2024-01-02'),
          lastReadDate: new Date('2024-01-09'),
          totalPages: 300,
          language: 'zh-CN'
        }
      ];

      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(mockBooks);
      mockCacheService.hasCache.mockResolvedValue(true);
      mockCacheService.preloadCache
        .mockResolvedValueOnce() // First book succeeds
        .mockRejectedValueOnce(new Error('Cache error')); // Second book fails

      // Should not throw, individual failures are handled
      const result = await startupOptimizer.optimizeStartup();

      expect(result).toHaveProperty('totalStartupTime');
      expect(result.recentBooksLoaded).toBe(2);
    });
  });

  describe('performance', () => {
    it('should complete startup optimization within reasonable time', async () => {
      const manyBooks = Array.from({ length: 20 }, (_, i) => ({
        id: `book-${i}`,
        title: `Book ${i}`,
        author: 'Author',
        format: 'epub' as const,
        filePath: `/path/to/book${i}.epub`,
        fileSize: 1024000,
        importDate: new Date('2024-01-01'),
        lastReadDate: new Date(`2024-01-${20 - i}`),
        totalPages: 200,
        language: 'zh-CN'
      }));

      mockDatabaseService.initialize.mockResolvedValue();
      mockDatabaseService.getBooks.mockResolvedValue(manyBooks);
      mockCacheService.hasCache.mockResolvedValue(true);
      mockCacheService.preloadCache.mockResolvedValue();

      const startTime = Date.now();
      const result = await startupOptimizer.optimizeStartup();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.recentBooksLoaded).toBe(5); // Limited to 5 recent books
    });
  });
});