import { performance } from 'perf_hooks';
import { DatabaseService } from '../../main/services/DatabaseService';
import { CacheService } from '../../main/services/CacheService';
import { PaginationService } from '../../main/services/PaginationService';
import { BookMetadata, BookContent, ReadingProgress } from '../../shared/types';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-performance')
  }
}));

describe('Performance Tests', () => {
  let databaseService: DatabaseService;
  let cacheService: CacheService;
  let paginationService: PaginationService;

  beforeAll(async () => {
    databaseService = new DatabaseService();
    await databaseService.initialize();
    
    cacheService = new CacheService('/tmp/test-cache');
    paginationService = new PaginationService();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Database Performance', () => {
    it('should handle bulk book insertion efficiently', async () => {
      const bookCount = 100;
      const books: BookMetadata[] = Array.from({ length: bookCount }, (_, i) => ({
        id: `perf-book-${i}`,
        title: `Performance Test Book ${i}`,
        author: `Author ${i}`,
        format: 'epub' as const,
        filePath: `/path/to/book-${i}.epub`,
        fileSize: 1024000 + i * 1000,
        importDate: new Date(),
        totalPages: 200 + i * 10,
        language: 'zh-CN'
      }));

      const startTime = performance.now();

      // Insert books in parallel
      await Promise.all(books.map(book => databaseService.saveBook(book)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all books were inserted
      const retrievedBooks = await databaseService.getBooks();
      expect(retrievedBooks.length).toBeGreaterThanOrEqual(bookCount);

      console.log(`Bulk insertion of ${bookCount} books took ${duration.toFixed(2)}ms`);
    });

    it('should handle bulk progress updates efficiently', async () => {
      const progressCount = 50;
      const bookId = 'perf-book-1';
      
      const progressUpdates: ReadingProgress[] = Array.from({ length: progressCount }, (_, i) => ({
        bookId,
        currentPage: i + 1,
        currentChapter: Math.floor(i / 10),
        percentage: ((i + 1) / progressCount) * 100,
        position: `page-${i + 1}`,
        lastUpdateTime: new Date(Date.now() + i * 1000)
      }));

      const startTime = performance.now();

      // Update progress sequentially (as would happen in real usage)
      for (const progress of progressUpdates) {
        await databaseService.saveProgress(bookId, progress);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds

      console.log(`${progressCount} progress updates took ${duration.toFixed(2)}ms`);
    });

    it('should handle large vocabulary operations efficiently', async () => {
      const vocabCount = 200;
      const bookId = 'perf-book-1';
      
      const vocabularyItems = Array.from({ length: vocabCount }, (_, i) => ({
        id: `vocab-${i}`,
        word: `word${i}`,
        translation: `翻译${i}`,
        bookId,
        context: `This is context for word ${i}`,
        addedDate: new Date(),
        mastered: i % 10 === 0 // Every 10th word is mastered
      }));

      const startTime = performance.now();

      // Add vocabulary items
      await Promise.all(vocabularyItems.map(item => databaseService.addVocabulary(item)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // 3 seconds

      // Verify retrieval performance
      const retrievalStart = performance.now();
      const retrievedVocab = await databaseService.getVocabulary(bookId);
      const retrievalEnd = performance.now();
      const retrievalDuration = retrievalEnd - retrievalStart;

      expect(retrievalDuration).toBeLessThan(500); // 500ms
      expect(retrievedVocab.length).toBe(vocabCount);

      console.log(`Vocabulary operations: Insert ${duration.toFixed(2)}ms, Retrieve ${retrievalDuration.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should handle large content caching efficiently', async () => {
      const largeContent: BookContent = {
        bookId: 'large-book',
        chapters: Array.from({ length: 50 }, (_, i) => ({
          id: `chapter-${i}`,
          title: `Chapter ${i}`,
          content: '<p>' + 'Large content text. '.repeat(1000) + '</p>',
          pageCount: 20,
          startPage: i * 20 + 1
        })),
        toc: Array.from({ length: 50 }, (_, i) => ({
          id: `toc-${i}`,
          title: `Chapter ${i}`,
          level: 1,
          page: i * 20 + 1
        })),
        rawContent: 'Raw content here'
      };

      const startTime = performance.now();

      await cacheService.generateCache('large-book', largeContent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 2 seconds

      // Test cache retrieval performance
      const retrievalStart = performance.now();
      const cachedContent = await cacheService.getCache('large-book');
      const retrievalEnd = performance.now();
      const retrievalDuration = retrievalEnd - retrievalStart;

      expect(retrievalDuration).toBeLessThan(500); // 500ms
      expect(cachedContent).not.toBeNull();
      expect(cachedContent!.chapters.length).toBe(50);

      console.log(`Large content caching: Generate ${duration.toFixed(2)}ms, Retrieve ${retrievalDuration.toFixed(2)}ms`);
    });

    it('should handle cache cleanup efficiently', async () => {
      // Generate multiple cache files
      const cacheCount = 20;
      const cachePromises = Array.from({ length: cacheCount }, async (_, i) => {
        const content: BookContent = {
          bookId: `cleanup-book-${i}`,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'Content '.repeat(100),
            pageCount: 10,
            startPage: 1
          }],
          toc: [{
            id: 'toc-1',
            title: 'Chapter 1',
            level: 1,
            page: 1
          }],
          rawContent: 'Raw content'
        };
        
        return cacheService.generateCache(`cleanup-book-${i}`, content);
      });

      await Promise.all(cachePromises);

      const startTime = performance.now();

      await cacheService.cleanupCache();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1 second

      console.log(`Cache cleanup took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large book pagination efficiently', async () => {
      const largeBook: BookContent = {
        bookId: 'pagination-book',
        chapters: Array.from({ length: 100 }, (_, i) => ({
          id: `chapter-${i}`,
          title: `Chapter ${i}`,
          content: '<p>' + 'Chapter content text. '.repeat(500) + '</p>',
          pageCount: 0,
          startPage: 0
        })),
        toc: [],
        rawContent: 'Raw content'
      };

      const startTime = performance.now();

      const paginatedContent = await paginationService.paginateContent(largeBook);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // 3 seconds
      expect(paginatedContent.chapters.length).toBe(100);
      
      // Verify pagination was applied
      paginatedContent.chapters.forEach(chapter => {
        expect(chapter.pageCount).toBeGreaterThan(0);
        expect(chapter.startPage).toBeGreaterThan(0);
      });

      console.log(`Pagination of large book took ${duration.toFixed(2)}ms`);
    });

    it('should handle page content retrieval efficiently', async () => {
      const book: BookContent = {
        bookId: 'retrieval-book',
        chapters: Array.from({ length: 20 }, (_, i) => ({
          id: `chapter-${i}`,
          title: `Chapter ${i}`,
          content: '<p>' + 'Content text. '.repeat(200) + '</p>',
          pageCount: 10,
          startPage: i * 10 + 1
        })),
        toc: [],
        rawContent: 'Raw content'
      };

      const paginatedContent = await paginationService.paginateContent(book);
      const totalPages = paginationService.getTotalPages(paginatedContent);

      const startTime = performance.now();

      // Retrieve multiple pages
      const pagePromises = Array.from({ length: Math.min(50, totalPages) }, (_, i) => {
        return paginationService.getPageContent(paginatedContent, i + 1);
      });

      const pages = await Promise.all(pagePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1 second
      expect(pages.filter(p => p !== null).length).toBeGreaterThan(0);

      console.log(`Page content retrieval took ${duration.toFixed(2)}ms for ${pages.length} pages`);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during intensive operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform intensive operations
      for (let i = 0; i < 10; i++) {
        const book: BookMetadata = {
          id: `memory-book-${i}`,
          title: `Memory Test Book ${i}`,
          author: 'Memory Author',
          format: 'epub',
          filePath: `/path/to/memory-book-${i}.epub`,
          fileSize: 1024000,
          importDate: new Date(),
          totalPages: 200,
          language: 'zh-CN'
        };

        await databaseService.saveBook(book);

        const content: BookContent = {
          bookId: book.id,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'Content '.repeat(1000),
            pageCount: 10,
            startPage: 1
          }],
          toc: [],
          rawContent: 'Raw content'
        };

        await cacheService.generateCache(book.id, content);
        await paginationService.paginateContent(content);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent database operations', async () => {
      const concurrentOperations = 20;
      
      const startTime = performance.now();

      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        const book: BookMetadata = {
          id: `concurrent-book-${i}`,
          title: `Concurrent Book ${i}`,
          author: 'Concurrent Author',
          format: 'epub',
          filePath: `/path/to/concurrent-book-${i}.epub`,
          fileSize: 1024000,
          importDate: new Date(),
          totalPages: 200,
          language: 'zh-CN'
        };

        await databaseService.saveBook(book);
        
        const progress: ReadingProgress = {
          bookId: book.id,
          currentPage: 1,
          currentChapter: 0,
          percentage: 1,
          position: 'start',
          lastUpdateTime: new Date()
        };

        await databaseService.saveProgress(book.id, progress);
        
        return databaseService.getBook(book.id);
      });

      const results = await Promise.all(operations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(results.filter(r => r !== null).length).toBe(concurrentOperations);

      console.log(`${concurrentOperations} concurrent operations took ${duration.toFixed(2)}ms`);
    });
  });
});