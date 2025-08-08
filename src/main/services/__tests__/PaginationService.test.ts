import { PaginationService } from '../PaginationService';
import { BookContent } from '../../../shared/types';

describe('PaginationService', () => {
  let paginationService: PaginationService;
  let mockBookContent: BookContent;

  beforeEach(() => {
    paginationService = new PaginationService();
    
    mockBookContent = {
      bookId: 'test-book-1',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          content: '<p>This is chapter 1 content. '.repeat(100) + '</p>',
          pageCount: 0,
          startPage: 0
        },
        {
          id: 'chapter-2',
          title: 'Chapter 2',
          content: '<p>This is chapter 2 content. '.repeat(150) + '</p>',
          pageCount: 0,
          startPage: 0
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
          page: 51
        }
      ],
      rawContent: 'Raw content'
    };
  });

  afterEach(() => {
    paginationService.cleanup();
  });

  describe('initializePagination', () => {
    it('should initialize pagination for a book', async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
      
      const totalChunks = paginationService.getTotalChunks(mockBookContent.bookId);
      expect(totalChunks).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const emptyContent: BookContent = {
        ...mockBookContent,
        chapters: []
      };
      
      await paginationService.initializePagination(emptyContent.bookId, emptyContent);
      
      const totalChunks = paginationService.getTotalChunks(emptyContent.bookId);
      expect(totalChunks).toBe(0);
    });
  });

  describe('getChunk', () => {
    beforeEach(async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
    });

    it('should return correct chunk content', () => {
      const chunk = paginationService.getChunk(mockBookContent.bookId, 0);
      
      expect(chunk).toBeDefined();
      expect(chunk!.content).toContain('chapter 1 content');
      expect(chunk!.chapterIndex).toBe(0);
    });

    it('should return null for invalid chunk index', () => {
      const chunk = paginationService.getChunk(mockBookContent.bookId, 9999);
      
      expect(chunk).toBeNull();
    });

    it('should return null for non-existent book', () => {
      const chunk = paginationService.getChunk('non-existent-book', 0);
      
      expect(chunk).toBeNull();
    });
  });

  describe('getChunksInRange', () => {
    beforeEach(async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
    });

    it('should return chunks in specified range', () => {
      const chunks = paginationService.getChunksInRange(mockBookContent.bookId, 0, 2);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThanOrEqual(3);
    });

    it('should handle invalid range', () => {
      const chunks = paginationService.getChunksInRange(mockBookContent.bookId, -1, -1);
      
      expect(chunks).toEqual([]);
    });

    it('should return empty array for non-existent book', () => {
      const chunks = paginationService.getChunksInRange('non-existent-book', 0, 2);
      
      expect(chunks).toEqual([]);
    });
  });

  describe('getTotalChunks', () => {
    it('should return correct total chunk count', async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
      
      const totalChunks = paginationService.getTotalChunks(mockBookContent.bookId);
      
      expect(totalChunks).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent book', () => {
      const totalChunks = paginationService.getTotalChunks('non-existent-book');
      
      expect(totalChunks).toBe(0);
    });
  });

  describe('findChunkByPosition', () => {
    beforeEach(async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
    });

    it('should find correct chunk by character position', () => {
      const chunkIndex = paginationService.findChunkByPosition(mockBookContent.bookId, 100);
      
      expect(chunkIndex).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for position 0', () => {
      const chunkIndex = paginationService.findChunkByPosition(mockBookContent.bookId, 0);
      
      expect(chunkIndex).toBe(0);
    });

    it('should return 0 for non-existent book', () => {
      const chunkIndex = paginationService.findChunkByPosition('non-existent-book', 100);
      
      expect(chunkIndex).toBe(0);
    });
  });

  describe('getMemoryStats', () => {
    beforeEach(async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
    });

    it('should return memory statistics', () => {
      // Load some chunks first
      paginationService.getChunk(mockBookContent.bookId, 0);
      paginationService.getChunk(mockBookContent.bookId, 1);
      
      const stats = paginationService.getMemoryStats(mockBookContent.bookId);
      
      expect(stats).toHaveProperty('loadedChunks');
      expect(stats).toHaveProperty('totalChunks');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats.totalChunks).toBeGreaterThan(0);
    });

    it('should return zero stats for non-existent book', () => {
      const stats = paginationService.getMemoryStats('non-existent-book');
      
      expect(stats.loadedChunks).toBe(0);
      expect(stats.totalChunks).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('clearBookCache', () => {
    beforeEach(async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
    });

    it('should clear all cached data for a book', () => {
      // Load some chunks first
      paginationService.getChunk(mockBookContent.bookId, 0);
      
      paginationService.clearBookCache(mockBookContent.bookId);
      
      const totalChunks = paginationService.getTotalChunks(mockBookContent.bookId);
      expect(totalChunks).toBe(0);
    });
  });

  describe('forceCleanup', () => {
    it('should force cleanup of unused chunks', async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
      
      // Load some chunks
      paginationService.getChunk(mockBookContent.bookId, 0);
      
      // Force cleanup should not throw
      expect(() => paginationService.forceCleanup()).not.toThrow();
    });
  });

  describe('getDetailedMemoryStats', () => {
    it('should return detailed memory statistics', async () => {
      await paginationService.initializePagination(mockBookContent.bookId, mockBookContent);
      
      // Load some chunks
      paginationService.getChunk(mockBookContent.bookId, 0);
      
      const stats = paginationService.getDetailedMemoryStats();
      
      expect(stats).toHaveProperty('totalBooks');
      expect(stats).toHaveProperty('totalCachedChunks');
      expect(stats).toHaveProperty('estimatedMemoryUsage');
      expect(stats).toHaveProperty('bookStats');
      expect(Array.isArray(stats.bookStats)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed content gracefully', async () => {
      const malformedContent: BookContent = {
        ...mockBookContent,
        chapters: [
          {
            id: 'bad-chapter',
            title: 'Bad Chapter',
            content: '', // Empty content
            pageCount: 0,
            startPage: 0
          }
        ]
      };
      
      await expect(paginationService.initializePagination(malformedContent.bookId, malformedContent))
        .resolves.toBeUndefined();
    });

    it('should handle very long content', async () => {
      const longContent: BookContent = {
        ...mockBookContent,
        chapters: [
          {
            id: 'long-chapter',
            title: 'Long Chapter',
            content: '<p>' + 'Very long content. '.repeat(10000) + '</p>',
            pageCount: 0,
            startPage: 0
          }
        ]
      };
      
      await paginationService.initializePagination(longContent.bookId, longContent);
      
      const totalChunks = paginationService.getTotalChunks(longContent.bookId);
      expect(totalChunks).toBeGreaterThan(10);
    });
  });

  describe('memory management', () => {
    it('should manage memory efficiently with many chunks', async () => {
      const largeContent: BookContent = {
        ...mockBookContent,
        chapters: Array.from({ length: 10 }, (_, i) => ({
          id: `chapter-${i}`,
          title: `Chapter ${i}`,
          content: '<p>' + 'Content text. '.repeat(1000) + '</p>',
          pageCount: 0,
          startPage: 0
        }))
      };
      
      await paginationService.initializePagination(largeContent.bookId, largeContent);
      
      // Load many chunks
      for (let i = 0; i < 30; i++) {
        paginationService.getChunk(largeContent.bookId, i);
      }
      
      const stats = paginationService.getMemoryStats(largeContent.bookId);
      
      // Should have limited the number of loaded chunks
      expect(stats.loadedChunks).toBeLessThanOrEqual(25); // Based on default config
    });
  });
});