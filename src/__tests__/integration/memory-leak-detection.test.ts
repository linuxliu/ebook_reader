import { PaginationService } from '../../main/services/PaginationService';
import { CacheService } from '../../main/services/CacheService';
import { BookContent } from '../../shared/types';

describe('Memory Leak Detection', () => {
  let paginationService: PaginationService;
  let cacheService: CacheService;

  beforeEach(() => {
    paginationService = new PaginationService();
    cacheService = new CacheService('/tmp/memory-test-cache');
  });

  afterEach(() => {
    paginationService.cleanup();
  });

  describe('PaginationService Memory Management', () => {
    it('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform many pagination operations
      for (let i = 0; i < 50; i++) {
        const content: BookContent = {
          bookId: `memory-test-book-${i}`,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'Content '.repeat(1000),
            pageCount: 0,
            startPage: 0
          }],
          toc: [],
          rawContent: 'Raw content'
        };

        await paginationService.initializePagination(content.bookId, content);
        
        // Access some chunks
        for (let j = 0; j < 5; j++) {
          paginationService.getChunk(content.bookId, j);
        }

        // Clear cache for this book
        paginationService.clearBookCache(content.bookId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);

      console.log(`Memory increase after 50 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should cleanup memory when chunks are evicted', async () => {
      const content: BookContent = {
        bookId: 'memory-eviction-test',
        chapters: Array.from({ length: 20 }, (_, i) => ({
          id: `chapter-${i}`,
          title: `Chapter ${i}`,
          content: 'Content '.repeat(500),
          pageCount: 0,
          startPage: 0
        })),
        toc: [],
        rawContent: 'Raw content'
      };

      await paginationService.initializePagination(content.bookId, content);

      const initialStats = paginationService.getMemoryStats(content.bookId);

      // Load many chunks to trigger eviction
      for (let i = 0; i < 50; i++) {
        paginationService.getChunk(content.bookId, i);
      }

      const afterLoadStats = paginationService.getMemoryStats(content.bookId);

      // Should have limited the number of loaded chunks due to eviction
      expect(afterLoadStats.loadedChunks).toBeLessThanOrEqual(25); // Based on default config

      paginationService.clearBookCache(content.bookId);
    });

    it('should handle memory pressure gracefully', async () => {
      const books: BookContent[] = Array.from({ length: 10 }, (_, i) => ({
        bookId: `pressure-test-book-${i}`,
        chapters: Array.from({ length: 10 }, (_, j) => ({
          id: `chapter-${j}`,
          title: `Chapter ${j}`,
          content: 'Large content '.repeat(200),
          pageCount: 0,
          startPage: 0
        })),
        toc: [],
        rawContent: 'Raw content'
      }));

      // Initialize all books
      for (const book of books) {
        await paginationService.initializePagination(book.bookId, book);
      }

      // Load chunks from all books
      for (const book of books) {
        for (let i = 0; i < 10; i++) {
          paginationService.getChunk(book.bookId, i);
        }
      }

      // Get detailed memory stats
      const detailedStats = paginationService.getDetailedMemoryStats();

      expect(detailedStats.totalBooks).toBe(10);
      expect(detailedStats.estimatedMemoryUsage).toBeGreaterThan(0);

      // Force cleanup
      paginationService.forceCleanup();

      // Clean up all books
      for (const book of books) {
        paginationService.clearBookCache(book.bookId);
      }
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should properly cleanup event listeners', () => {
      // This test would be more relevant for renderer components
      // but we can test the pattern here

      const listeners: Array<() => void> = [];
      const mockEventTarget = {
        addEventListener: jest.fn((event, listener) => {
          listeners.push(listener);
        }),
        removeEventListener: jest.fn((event, listener) => {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        })
      };

      // Simulate adding many listeners
      for (let i = 0; i < 100; i++) {
        const listener = () => console.log(`Listener ${i}`);
        mockEventTarget.addEventListener('test', listener);
      }

      expect(listeners.length).toBe(100);

      // Simulate cleanup
      listeners.forEach(listener => {
        mockEventTarget.removeEventListener('test', listener);
      });

      expect(listeners.length).toBe(0);
    });
  });

  describe('Cache Memory Management', () => {
    it('should manage cache memory efficiently', async () => {
      const initialMemory = process.memoryUsage();

      // Generate many cache entries
      for (let i = 0; i < 20; i++) {
        const content: BookContent = {
          bookId: `cache-memory-book-${i}`,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'Cache content '.repeat(500),
            pageCount: 0,
            startPage: 0
          }],
          toc: [],
          rawContent: 'Raw content'
        };

        await cacheService.generateCache(content.bookId, content);
      }

      // Get cache size
      const cacheSize = await cacheService.getCacheSize();
      expect(cacheSize).toBeGreaterThan(0);

      // Cleanup cache
      await cacheService.cleanupCache();

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Should not have significant memory increase after cleanup
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold

      console.log(`Cache memory test increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Resource Cleanup Verification', () => {
    it('should verify all resources are properly cleaned up', async () => {
      const resourceTracker = {
        openFiles: 0,
        activeTimers: 0,
        eventListeners: 0
      };

      // Mock resource tracking
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      const activeTimeouts = new Set();

      global.setTimeout = ((callback: any, delay: any) => {
        const id = originalSetTimeout(callback, delay);
        activeTimeouts.add(id);
        resourceTracker.activeTimers++;
        return id;
      }) as any;

      global.clearTimeout = (id: any) => {
        if (activeTimeouts.has(id)) {
          activeTimeouts.delete(id);
          resourceTracker.activeTimers--;
        }
        return originalClearTimeout(id);
      };

      // Perform operations that create resources
      const content: BookContent = {
        bookId: 'resource-cleanup-test',
        chapters: [{
          id: 'chapter-1',
          title: 'Chapter 1',
          content: 'Content for cleanup test',
          pageCount: 0,
          startPage: 0
        }],
        toc: [],
        rawContent: 'Raw content'
      };

      await paginationService.initializePagination(content.bookId, content);
      paginationService.getChunk(content.bookId, 0);

      // Cleanup
      paginationService.cleanup();

      // Verify cleanup
      expect(resourceTracker.activeTimers).toBe(0);

      // Restore original functions
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    });
  });

  describe('Long Running Operations', () => {
    it('should maintain stable memory usage over time', async () => {
      const memorySnapshots: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        // Perform typical operations
        const content: BookContent = {
          bookId: `long-running-book-${i}`,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'Long running content '.repeat(100),
            pageCount: 0,
            startPage: 0
          }],
          toc: [],
          rawContent: 'Raw content'
        };

        await paginationService.initializePagination(content.bookId, content);
        
        // Access some chunks
        for (let j = 0; j < 3; j++) {
          paginationService.getChunk(content.bookId, j);
        }

        // Take memory snapshot every 5 iterations
        if (i % 5 === 0) {
          if (global.gc) global.gc();
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }

        // Cleanup this iteration
        paginationService.clearBookCache(content.bookId);
      }

      // Analyze memory trend
      if (memorySnapshots.length > 1) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const memoryGrowth = lastSnapshot - firstSnapshot;

        // Memory growth should be minimal (less than 10MB)
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

        console.log(`Memory growth over ${iterations} iterations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });
});