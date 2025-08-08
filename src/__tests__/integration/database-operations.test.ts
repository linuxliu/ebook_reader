import { DatabaseService } from '../../main/services/DatabaseService';
import { CacheService } from '../../main/services/CacheService';
import { BookMetadata, ReadingProgress, VocabularyItem } from '../../shared/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-integration')
  }
}));

describe('Database Operations Integration', () => {
  let databaseService: DatabaseService;
  let cacheService: CacheService;
  let testDbPath: string;

  beforeAll(async () => {
    // Setup test environment
    const testDir = '/tmp/test-integration';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testDbPath = path.join(testDir, 'integration-test.db');
    
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    databaseService = new DatabaseService();
    cacheService = new CacheService(path.join(testDir, 'cache'));
    
    await databaseService.initialize();
  });

  afterAll(async () => {
    await databaseService.close();
    
    // Clean up test files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Complete Book Lifecycle', () => {
    const testBook: BookMetadata = {
      id: 'integration-book-1',
      title: 'Integration Test Book',
      author: 'Test Author',
      format: 'epub',
      filePath: '/path/to/integration-book.epub',
      fileSize: 2048000,
      importDate: new Date('2024-01-01'),
      totalPages: 300,
      language: 'zh-CN'
    };

    it('should handle complete book import and reading flow', async () => {
      // Step 1: Import book
      const bookId = await databaseService.saveBook(testBook);
      expect(bookId).toBe(testBook.id);

      // Step 2: Verify book was saved
      const savedBook = await databaseService.getBook(testBook.id);
      expect(savedBook).not.toBeNull();
      expect(savedBook!.title).toBe(testBook.title);

      // Step 3: Start reading - save initial progress
      const initialProgress: ReadingProgress = {
        bookId: testBook.id,
        currentPage: 1,
        currentChapter: 0,
        percentage: 0.33,
        position: 'start',
        lastUpdateTime: new Date()
      };

      await databaseService.saveProgress(testBook.id, initialProgress);

      // Step 4: Verify progress was saved
      const savedProgress = await databaseService.getProgress(testBook.id);
      expect(savedProgress).not.toBeNull();
      expect(savedProgress!.currentPage).toBe(1);

      // Step 5: Continue reading - update progress
      const updatedProgress: ReadingProgress = {
        ...initialProgress,
        currentPage: 50,
        percentage: 16.67,
        position: 'chapter-2-page-50',
        lastUpdateTime: new Date()
      };

      await databaseService.saveProgress(testBook.id, updatedProgress);

      // Step 6: Add vocabulary while reading
      const vocabulary: VocabularyItem = {
        id: 'vocab-integration-1',
        word: 'serendipity',
        translation: '意外发现',
        pronunciation: '/ˌserənˈdɪpɪti/',
        example: 'It was pure serendipity that we met.',
        bookId: testBook.id,
        context: 'The serendipity of the moment was not lost on him.',
        addedDate: new Date(),
        mastered: false
      };

      await databaseService.addVocabulary(vocabulary);

      // Step 7: Verify vocabulary was added
      const bookVocabulary = await databaseService.getVocabulary(testBook.id);
      expect(bookVocabulary).toHaveLength(1);
      expect(bookVocabulary[0].word).toBe('serendipity');

      // Step 8: Update reading settings
      const readingSettings = {
        bookId: testBook.id,
        fontFamily: 'Arial',
        fontSize: 18,
        lineHeight: 1.6,
        margin: 25,
        theme: 'dark' as const,
        pageMode: 'pagination' as const
      };

      await databaseService.saveSettings(testBook.id, readingSettings);

      // Step 9: Verify settings were saved
      const savedSettings = await databaseService.getSettings(testBook.id);
      expect(savedSettings).not.toBeNull();
      expect(savedSettings!.fontSize).toBe(18);
      expect(savedSettings!.theme).toBe('dark');

      // Step 10: Verify book appears in recent books
      const allBooks = await databaseService.getBooks();
      const recentBooks = allBooks.filter(book => book.lastReadDate);
      expect(recentBooks.length).toBeGreaterThan(0);

      // Step 11: Mark vocabulary as mastered
      await databaseService.markWordAsMastered(vocabulary.id, true);
      const masteredVocab = await databaseService.getVocabulary(testBook.id);
      expect(masteredVocab[0].mastered).toBe(true);
    });

    it('should handle book deletion with cascade', async () => {
      // Ensure book exists with related data
      await databaseService.saveBook(testBook);
      
      const progress: ReadingProgress = {
        bookId: testBook.id,
        currentPage: 25,
        currentChapter: 1,
        percentage: 8.33,
        position: 'chapter-1-page-25',
        lastUpdateTime: new Date()
      };
      await databaseService.saveProgress(testBook.id, progress);

      const vocabulary: VocabularyItem = {
        id: 'vocab-delete-test',
        word: 'ephemeral',
        translation: '短暂的',
        bookId: testBook.id,
        context: 'Life is ephemeral.',
        addedDate: new Date(),
        mastered: false
      };
      await databaseService.addVocabulary(vocabulary);

      // Delete book
      await databaseService.deleteBook(testBook.id);

      // Verify book and all related data are deleted
      const deletedBook = await databaseService.getBook(testBook.id);
      expect(deletedBook).toBeNull();

      const deletedProgress = await databaseService.getProgress(testBook.id);
      expect(deletedProgress).toBeNull();

      const deletedVocabulary = await databaseService.getVocabulary(testBook.id);
      expect(deletedVocabulary).toHaveLength(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent book operations', async () => {
      const books: BookMetadata[] = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-book-${i}`,
        title: `Concurrent Book ${i}`,
        author: `Author ${i}`,
        format: 'epub' as const,
        filePath: `/path/to/concurrent-book-${i}.epub`,
        fileSize: 1024000 + i * 100000,
        importDate: new Date(),
        totalPages: 200 + i * 50,
        language: 'zh-CN'
      }));

      // Save all books concurrently
      const savePromises = books.map(book => databaseService.saveBook(book));
      const savedIds = await Promise.all(savePromises);

      expect(savedIds).toHaveLength(5);
      savedIds.forEach((id, index) => {
        expect(id).toBe(books[index].id);
      });

      // Read all books concurrently
      const readPromises = books.map(book => databaseService.getBook(book.id));
      const readBooks = await Promise.all(readPromises);

      expect(readBooks).toHaveLength(5);
      readBooks.forEach((book, index) => {
        expect(book).not.toBeNull();
        expect(book!.title).toBe(books[index].title);
      });

      // Clean up
      const deletePromises = books.map(book => databaseService.deleteBook(book.id));
      await Promise.all(deletePromises);
    });

    it('should handle concurrent progress updates', async () => {
      const testBook: BookMetadata = {
        id: 'progress-concurrent-book',
        title: 'Progress Test Book',
        author: 'Test Author',
        format: 'epub',
        filePath: '/path/to/progress-book.epub',
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 100,
        language: 'zh-CN'
      };

      await databaseService.saveBook(testBook);

      // Simulate rapid progress updates
      const progressUpdates = Array.from({ length: 10 }, (_, i) => ({
        bookId: testBook.id,
        currentPage: i + 1,
        currentChapter: Math.floor(i / 3),
        percentage: ((i + 1) / 100) * 100,
        position: `page-${i + 1}`,
        lastUpdateTime: new Date(Date.now() + i * 100)
      }));

      // Update progress concurrently
      const updatePromises = progressUpdates.map(progress => 
        databaseService.saveProgress(testBook.id, progress)
      );
      await Promise.all(updatePromises);

      // Verify final progress
      const finalProgress = await databaseService.getProgress(testBook.id);
      expect(finalProgress).not.toBeNull();
      expect(finalProgress!.currentPage).toBeGreaterThan(0);

      // Clean up
      await databaseService.deleteBook(testBook.id);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      const testBook: BookMetadata = {
        id: 'integrity-book',
        title: 'Integrity Test Book',
        author: 'Test Author',
        format: 'epub',
        filePath: '/path/to/integrity-book.epub',
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 200,
        language: 'zh-CN'
      };

      await databaseService.saveBook(testBook);

      // Add related data
      const progress: ReadingProgress = {
        bookId: testBook.id,
        currentPage: 10,
        currentChapter: 1,
        percentage: 5,
        position: 'chapter-1-page-10',
        lastUpdateTime: new Date()
      };

      const vocabulary: VocabularyItem = {
        id: 'integrity-vocab',
        word: 'integrity',
        translation: '完整性',
        bookId: testBook.id,
        context: 'Data integrity is important.',
        addedDate: new Date(),
        mastered: false
      };

      await databaseService.saveProgress(testBook.id, progress);
      await databaseService.addVocabulary(vocabulary);

      // Verify relationships
      const savedProgress = await databaseService.getProgress(testBook.id);
      const savedVocabulary = await databaseService.getVocabulary(testBook.id);

      expect(savedProgress!.bookId).toBe(testBook.id);
      expect(savedVocabulary[0].bookId).toBe(testBook.id);

      // Clean up
      await databaseService.deleteBook(testBook.id);
    });

    it('should handle transaction rollback on errors', async () => {
      const invalidBook = {
        id: 'invalid-book',
        title: 'Invalid Book',
        author: 'Test Author',
        format: 'invalid-format', // This should cause an error
        filePath: '/path/to/invalid-book.epub',
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 200,
        language: 'zh-CN'
      } as any;

      // This should fail due to invalid format
      await expect(databaseService.saveBook(invalidBook)).rejects.toThrow();

      // Verify no partial data was saved
      const book = await databaseService.getBook('invalid-book');
      expect(book).toBeNull();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large vocabulary operations efficiently', async () => {
      const testBook: BookMetadata = {
        id: 'performance-book',
        title: 'Performance Test Book',
        author: 'Test Author',
        format: 'epub',
        filePath: '/path/to/performance-book.epub',
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 500,
        language: 'zh-CN'
      };

      await databaseService.saveBook(testBook);

      // Add many vocabulary items
      const vocabularyItems = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-vocab-${i}`,
        word: `word${i}`,
        translation: `翻译${i}`,
        bookId: testBook.id,
        context: `This is context for word ${i}`,
        addedDate: new Date(),
        mastered: i % 10 === 0
      }));

      const startTime = Date.now();

      // Add vocabulary in batches
      const batchSize = 10;
      for (let i = 0; i < vocabularyItems.length; i += batchSize) {
        const batch = vocabularyItems.slice(i, i + batchSize);
        await Promise.all(batch.map(item => databaseService.addVocabulary(item)));
      }

      const addTime = Date.now() - startTime;

      // Retrieve all vocabulary
      const retrieveStart = Date.now();
      const allVocabulary = await databaseService.getVocabulary(testBook.id);
      const retrieveTime = Date.now() - retrieveStart;

      expect(allVocabulary).toHaveLength(100);
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve within 1 second

      console.log(`Performance test: Add ${addTime}ms, Retrieve ${retrieveTime}ms`);

      // Clean up
      await databaseService.deleteBook(testBook.id);
    });
  });
});