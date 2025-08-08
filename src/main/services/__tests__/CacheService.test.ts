import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CacheService } from '../CacheService';
import { BookContent, CachedBook, ErrorType } from '../../../shared/types';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockCacheDir: string;
  let mockBookContent: BookContent;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock cache directory
    mockCacheDir = path.join(os.tmpdir(), 'test-cache');
    cacheService = new CacheService(mockCacheDir);

    // Setup mock book content
    mockBookContent = {
      bookId: 'test-book-1',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          content: 'This is chapter 1 content',
          pageCount: 10,
          startPage: 1
        },
        {
          id: 'chapter-2',
          title: 'Chapter 2',
          content: 'This is chapter 2 content',
          pageCount: 15,
          startPage: 11
        }
      ],
      toc: [
        {
          id: 'toc-1',
          title: 'Chapter 1',
          level: 1,
          page: 1
        },
        {
          id: 'toc-2',
          title: 'Chapter 2',
          level: 1,
          page: 11
        }
      ],
      rawContent: 'Raw book content'
    };

    // Default mock implementations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('');
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({
      size: 1024,
      atime: new Date(),
      mtime: new Date()
    } as any);
  });

  describe('generateCache', () => {
    it('should generate cache successfully', async () => {
      const expectedCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: mockBookContent.chapters,
        toc: mockBookContent.toc,
        metadata: 'test-book-1' as any,
        cacheVersion: '1.0.0',
        createdAt: expect.any(Date)
      };

      await cacheService.generateCache('test-book-1', mockBookContent);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json'),
        expect.stringContaining('"bookId": "test-book-1"'),
        'utf-8'
      );
    });

    it('should create cache directory if it does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      await cacheService.generateCache('test-book-1', mockBookContent);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockCacheDir, { recursive: true });
    });

    it('should throw cache error when write fails', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));

      await expect(cacheService.generateCache('test-book-1', mockBookContent))
        .rejects.toMatchObject({
          type: ErrorType.CACHE_ERROR,
          message: 'Failed to generate cache'
        });
    });
  });

  describe('getCache', () => {
    it('should return cached book when cache exists and is valid', async () => {
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: mockBookContent.chapters,
        toc: mockBookContent.toc,
        metadata: {} as any,
        cacheVersion: '1.0.0',
        createdAt: new Date()
      };

      // Mock both calls to readFile - one for isCacheValid and one for getCache
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)) // for isCacheValid
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)); // for getCache

      const result = await cacheService.getCache('test-book-1');

      expect(result).toEqual({
        ...mockCachedBook,
        createdAt: expect.any(Date)
      });
      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json')
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json'),
        'utf-8'
      );
    });

    it('should return null when cache file does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      const result = await cacheService.getCache('test-book-1');

      expect(result).toBeNull();
    });

    it('should return null and invalidate cache when version is outdated', async () => {
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: mockBookContent.chapters,
        toc: mockBookContent.toc,
        metadata: {} as any,
        cacheVersion: '0.9.0', // Outdated version
        createdAt: new Date()
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedBook));

      const result = await cacheService.getCache('test-book-1');

      expect(result).toBeNull();
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json')
      );
    });

    it('should handle corrupted cache file', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');

      await expect(cacheService.getCache('test-book-1'))
        .rejects.toMatchObject({
          type: ErrorType.CACHE_ERROR,
          message: 'Failed to read cache'
        });

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json')
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache file successfully', async () => {
      await cacheService.invalidateCache('test-book-1');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json')
      );
    });

    it('should ignore error when file does not exist', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.unlink.mockRejectedValueOnce(error);

      await expect(cacheService.invalidateCache('test-book-1')).resolves.toBeUndefined();
    });

    it('should throw error for other unlink failures', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cacheService.invalidateCache('test-book-1'))
        .rejects.toMatchObject({
          type: ErrorType.CACHE_ERROR,
          message: 'Failed to invalidate cache'
        });
    });
  });

  describe('getCacheSize', () => {
    it('should calculate total cache size correctly', async () => {
      mockFs.readdir.mockResolvedValueOnce([
        'test-book-1.cache.json',
        'test-book-2.cache.json',
        'other-file.txt'
      ] as any);

      mockFs.stat
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any);

      const result = await cacheService.getCacheSize();

      expect(result).toBe(3072); // 1024 + 2048
      expect(mockFs.stat).toHaveBeenCalledTimes(2); // Only cache files
    });

    it('should return 0 when no cache files exist', async () => {
      mockFs.readdir.mockResolvedValueOnce([]);

      const result = await cacheService.getCacheSize();

      expect(result).toBe(0);
    });

    it('should ignore files that cannot be accessed', async () => {
      mockFs.readdir.mockResolvedValueOnce(['test-book-1.cache.json'] as any);
      mockFs.stat.mockRejectedValueOnce(new Error('Access denied'));

      const result = await cacheService.getCacheSize();

      expect(result).toBe(0);
    });
  });

  describe('cleanupCache', () => {
    it('should not delete files when under size limit', async () => {
      mockFs.readdir.mockResolvedValueOnce(['test-book-1.cache.json'] as any);
      mockFs.stat.mockResolvedValueOnce({
        size: 1024,
        atime: new Date(),
        mtime: new Date()
      } as any);

      // Mock getCacheSize to return small size
      jest.spyOn(cacheService, 'getCacheSize').mockResolvedValueOnce(1024);

      await cacheService.cleanupCache();

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should delete oldest files when over size limit', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-12-01');

      mockFs.readdir.mockResolvedValueOnce([
        'old-book.cache.json',
        'new-book.cache.json'
      ] as any);

      mockFs.stat
        .mockResolvedValueOnce({
          size: 500 * 1024 * 1024, // 500MB
          atime: oldDate,
          mtime: oldDate
        } as any)
        .mockResolvedValueOnce({
          size: 600 * 1024 * 1024, // 600MB
          atime: newDate,
          mtime: newDate
        } as any);

      // Mock getCacheSize to return size over limit
      jest.spyOn(cacheService, 'getCacheSize').mockResolvedValueOnce(1.2 * 1024 * 1024 * 1024); // 1.2GB

      await cacheService.cleanupCache();

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'old-book.cache.json')
      );
    });
  });

  describe('isCacheValid', () => {
    it('should return true for valid cache', async () => {
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: [],
        toc: [],
        metadata: {} as any,
        cacheVersion: '1.0.0',
        createdAt: new Date()
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedBook));

      const result = await cacheService.isCacheValid('test-book-1');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      const result = await cacheService.isCacheValid('test-book-1');

      expect(result).toBe(false);
    });

    it('should return false for outdated version', async () => {
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: [],
        toc: [],
        metadata: {} as any,
        cacheVersion: '0.9.0',
        createdAt: new Date()
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedBook));

      const result = await cacheService.isCacheValid('test-book-1');

      expect(result).toBe(false);
    });

    it('should return false for corrupted cache', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');

      const result = await cacheService.isCacheValid('test-book-1');

      expect(result).toBe(false);
    });
  });

  describe('updateCacheVersion', () => {
    it('should update cache version successfully', async () => {
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: [],
        toc: [],
        metadata: {} as any,
        cacheVersion: '1.0.0',
        createdAt: new Date()
      };

      // Mock both calls to readFile - one for isCacheValid and one for getCache
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)) // for isCacheValid
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)); // for getCache

      await cacheService.updateCacheVersion('test-book-1', '2.0.0');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-book-1.cache.json'),
        expect.stringContaining('"cacheVersion": "2.0.0"'),
        'utf-8'
      );
    });

    it('should throw error when cache not found', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      await expect(cacheService.updateCacheVersion('test-book-1', '2.0.0'))
        .rejects.toMatchObject({
          type: ErrorType.CACHE_ERROR,
          message: 'Failed to update cache version'
        });
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-12-01');

      mockFs.readdir.mockResolvedValueOnce([
        'book1.cache.json',
        'book2.cache.json'
      ] as any);

      mockFs.stat
        .mockResolvedValueOnce({
          size: 1024,
          mtime: oldDate
        } as any)
        .mockResolvedValueOnce({
          size: 2048,
          mtime: newDate
        } as any);

      const result = await cacheService.getCacheStats();

      expect(result).toEqual({
        totalSize: 3072,
        fileCount: 2,
        oldestFile: oldDate,
        newestFile: newDate
      });
    });

    it('should return empty stats when no cache files exist', async () => {
      mockFs.readdir.mockResolvedValueOnce([]);

      const result = await cacheService.getCacheStats();

      expect(result).toEqual({
        totalSize: 0,
        fileCount: 0,
        oldestFile: null,
        newestFile: null
      });
    });
  });

  describe('clearAllCache', () => {
    it('should delete all cache files', async () => {
      mockFs.readdir.mockResolvedValueOnce([
        'book1.cache.json',
        'book2.cache.json',
        'other-file.txt'
      ] as any);

      await cacheService.clearAllCache();

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'book1.cache.json')
      );
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'book2.cache.json')
      );
    });

    it('should ignore deletion errors', async () => {
      mockFs.readdir.mockResolvedValueOnce(['book1.cache.json'] as any);
      mockFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cacheService.clearAllCache()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should create proper cache errors', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));

      await expect(cacheService.generateCache('test-book-1', mockBookContent))
        .rejects.toMatchObject({
          type: ErrorType.CACHE_ERROR,
          message: 'Failed to generate cache',
          details: expect.any(Error),
          timestamp: expect.any(Date),
          recoverable: true
        });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete cache lifecycle', async () => {
      // Generate cache
      await cacheService.generateCache('test-book-1', mockBookContent);
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Setup mock for reading cache
      const mockCachedBook: CachedBook = {
        bookId: 'test-book-1',
        chapters: mockBookContent.chapters,
        toc: mockBookContent.toc,
        metadata: {} as any,
        cacheVersion: '1.0.0',
        createdAt: new Date()
      };
      
      // Mock both calls to readFile - one for isCacheValid and one for getCache
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)) // for isCacheValid
        .mockResolvedValueOnce(JSON.stringify(mockCachedBook)); // for getCache

      // Get cache
      const cachedBook = await cacheService.getCache('test-book-1');
      expect(cachedBook).toEqual({
        ...mockCachedBook,
        createdAt: expect.any(Date)
      });

      // Invalidate cache
      await cacheService.invalidateCache('test-book-1');
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});