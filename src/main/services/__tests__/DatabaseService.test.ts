import { DatabaseService } from '../DatabaseService';
import {
  BookMetadata,
  ReadingProgress,
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  ErrorType
} from '../../../shared/types';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-ebook-reader')
  }
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let testDbPath: string;

  beforeEach(async () => {
    // 创建临时测试目录
    const testDir = '/tmp/test-ebook-reader';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testDbPath = path.join(testDir, 'ebook-reader.db');
    
    // 删除已存在的测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterEach(async () => {
    await dbService.close();
    
    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('书籍管理', () => {
    const mockBook: BookMetadata = {
      id: 'test-book-1',
      title: '测试书籍',
      author: '测试作者',
      cover: '/path/to/cover.jpg',
      format: 'epub',
      filePath: '/path/to/book.epub',
      fileSize: 1024000,
      importDate: new Date('2024-01-01'),
      lastReadDate: new Date('2024-01-02'),
      totalPages: 200,
      language: 'zh-CN'
    };

    test('应该能够保存书籍', async () => {
      const bookId = await dbService.saveBook(mockBook);
      expect(bookId).toBe(mockBook.id);
    });

    test('应该能够获取所有书籍', async () => {
      await dbService.saveBook(mockBook);
      
      const books = await dbService.getBooks();
      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject({
        id: mockBook.id,
        title: mockBook.title,
        author: mockBook.author
      });
    });

    test('应该能够根据ID获取单本书籍', async () => {
      await dbService.saveBook(mockBook);
      
      const book = await dbService.getBook(mockBook.id);
      expect(book).not.toBeNull();
      expect(book!.id).toBe(mockBook.id);
      expect(book!.title).toBe(mockBook.title);
    });

    test('获取不存在的书籍应该返回null', async () => {
      const book = await dbService.getBook('non-existent-id');
      expect(book).toBeNull();
    });

    test('应该能够更新书籍信息', async () => {
      await dbService.saveBook(mockBook);
      
      const updates = {
        title: '更新后的标题',
        lastReadDate: new Date('2024-01-03')
      };
      
      await dbService.updateBook(mockBook.id, updates);
      
      const updatedBook = await dbService.getBook(mockBook.id);
      expect(updatedBook!.title).toBe(updates.title);
      expect(updatedBook!.lastReadDate).toEqual(updates.lastReadDate);
    });

    test('应该能够删除书籍及其相关数据', async () => {
      await dbService.saveBook(mockBook);
      
      // 添加相关数据
      const progress: ReadingProgress = {
        bookId: mockBook.id,
        currentPage: 50,
        currentChapter: 3,
        percentage: 25,
        position: 'chapter-3-page-50',
        lastUpdateTime: new Date()
      };
      await dbService.saveProgress(mockBook.id, progress);
      
      const vocabulary: VocabularyItem = {
        id: 'vocab-1',
        word: 'test',
        translation: '测试',
        bookId: mockBook.id,
        context: 'This is a test',
        addedDate: new Date(),
        mastered: false
      };
      await dbService.addVocabulary(vocabulary);
      
      // 删除书籍
      await dbService.deleteBook(mockBook.id);
      
      // 验证书籍和相关数据都被删除
      const book = await dbService.getBook(mockBook.id);
      expect(book).toBeNull();
      
      const progressAfterDelete = await dbService.getProgress(mockBook.id);
      expect(progressAfterDelete).toBeNull();
      
      const vocabularyAfterDelete = await dbService.getVocabulary(mockBook.id);
      expect(vocabularyAfterDelete).toHaveLength(0);
    });
  });

  describe('阅读进度管理', () => {
    const mockBook: BookMetadata = {
      id: 'test-book-progress',
      title: '进度测试书籍',
      author: '测试作者',
      format: 'epub',
      filePath: '/path/to/progress-book.epub',
      fileSize: 1024000,
      importDate: new Date(),
      totalPages: 300,
      language: 'zh-CN'
    };

    const mockProgress: ReadingProgress = {
      bookId: 'test-book-progress',
      currentPage: 100,
      currentChapter: 5,
      percentage: 33.33,
      position: 'chapter-5-page-100',
      lastUpdateTime: new Date('2024-01-01T10:00:00Z')
    };

    beforeEach(async () => {
      await dbService.saveBook(mockBook);
    });

    test('应该能够保存阅读进度', async () => {
      await dbService.saveProgress(mockBook.id, mockProgress);
      
      const savedProgress = await dbService.getProgress(mockBook.id);
      expect(savedProgress).not.toBeNull();
      expect(savedProgress!.currentPage).toBe(mockProgress.currentPage);
      expect(savedProgress!.percentage).toBe(mockProgress.percentage);
    });

    test('保存进度时应该更新书籍的最后阅读时间', async () => {
      const beforeSave = new Date();
      await dbService.saveProgress(mockBook.id, mockProgress);
      
      const updatedBook = await dbService.getBook(mockBook.id);
      expect(updatedBook!.lastReadDate).toBeDefined();
      expect(updatedBook!.lastReadDate!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    });

    test('获取不存在的进度应该返回null', async () => {
      const progress = await dbService.getProgress('non-existent-book');
      expect(progress).toBeNull();
    });

    test('应该能够删除阅读进度', async () => {
      await dbService.saveProgress(mockBook.id, mockProgress);
      await dbService.deleteProgress(mockBook.id);
      
      const progress = await dbService.getProgress(mockBook.id);
      expect(progress).toBeNull();
    });

    test('应该能够覆盖已存在的进度', async () => {
      await dbService.saveProgress(mockBook.id, mockProgress);
      
      const newProgress: ReadingProgress = {
        ...mockProgress,
        currentPage: 150,
        percentage: 50
      };
      
      await dbService.saveProgress(mockBook.id, newProgress);
      
      const savedProgress = await dbService.getProgress(mockBook.id);
      expect(savedProgress!.currentPage).toBe(150);
      expect(savedProgress!.percentage).toBe(50);
    });
  });

  describe('生词表管理', () => {
    const mockBook: BookMetadata = {
      id: 'test-book-vocab',
      title: '生词测试书籍',
      author: '测试作者',
      format: 'epub',
      filePath: '/path/to/vocab-book.epub',
      fileSize: 1024000,
      importDate: new Date(),
      totalPages: 200,
      language: 'en-US'
    };

    const mockVocabulary: VocabularyItem = {
      id: 'vocab-test-1',
      word: 'serendipity',
      translation: '意外发现',
      pronunciation: '/ˌserənˈdɪpɪti/',
      example: 'It was pure serendipity that we met.',
      bookId: 'test-book-vocab',
      context: 'The serendipity of the moment was not lost on him.',
      addedDate: new Date('2024-01-01'),
      mastered: false
    };

    beforeEach(async () => {
      await dbService.saveBook(mockBook);
    });

    test('应该能够添加生词', async () => {
      await dbService.addVocabulary(mockVocabulary);
      
      const vocabulary = await dbService.getVocabulary(mockBook.id);
      expect(vocabulary).toHaveLength(1);
      expect(vocabulary[0].word).toBe(mockVocabulary.word);
      expect(vocabulary[0].translation).toBe(mockVocabulary.translation);
    });

    test('应该能够获取特定书籍的生词', async () => {
      const anotherBook: BookMetadata = {
        ...mockBook,
        id: 'another-book',
        title: '另一本书',
        filePath: '/path/to/another-book.epub' // 确保文件路径不同
      };
      await dbService.saveBook(anotherBook);

      const vocab1 = { ...mockVocabulary, id: 'vocab-1', bookId: mockBook.id };
      const vocab2 = { ...mockVocabulary, id: 'vocab-2', bookId: anotherBook.id, word: 'another' };

      await dbService.addVocabulary(vocab1);
      await dbService.addVocabulary(vocab2);

      const book1Vocab = await dbService.getVocabulary(mockBook.id);
      expect(book1Vocab).toHaveLength(1);
      expect(book1Vocab[0].word).toBe('serendipity');

      const book2Vocab = await dbService.getVocabulary(anotherBook.id);
      expect(book2Vocab).toHaveLength(1);
      expect(book2Vocab[0].word).toBe('another');
    });

    test('应该能够获取所有生词', async () => {
      const vocab1 = { ...mockVocabulary, id: 'vocab-1' };
      const vocab2 = { ...mockVocabulary, id: 'vocab-2', word: 'another' };

      await dbService.addVocabulary(vocab1);
      await dbService.addVocabulary(vocab2);

      const allVocab = await dbService.getVocabulary();
      expect(allVocab).toHaveLength(2);
    });

    test('应该能够删除生词', async () => {
      await dbService.addVocabulary(mockVocabulary);
      await dbService.deleteVocabulary(mockVocabulary.id);
      
      const vocabulary = await dbService.getVocabulary(mockBook.id);
      expect(vocabulary).toHaveLength(0);
    });

    test('应该能够更新生词', async () => {
      await dbService.addVocabulary(mockVocabulary);
      
      const updates = {
        translation: '更新后的翻译',
        mastered: true
      };
      
      await dbService.updateVocabulary(mockVocabulary.id, updates);
      
      const vocabulary = await dbService.getVocabulary(mockBook.id);
      expect(vocabulary[0].translation).toBe(updates.translation);
      expect(vocabulary[0].mastered).toBe(true);
    });

    test('应该能够标记生词为已掌握', async () => {
      await dbService.addVocabulary(mockVocabulary);
      await dbService.markWordAsMastered(mockVocabulary.id, true);
      
      const vocabulary = await dbService.getVocabulary(mockBook.id);
      expect(vocabulary[0].mastered).toBe(true);
    });

    test('应该能够覆盖已存在的生词', async () => {
      await dbService.addVocabulary(mockVocabulary);
      
      const updatedVocab = {
        ...mockVocabulary,
        translation: '新的翻译'
      };
      
      await dbService.addVocabulary(updatedVocab);
      
      const vocabulary = await dbService.getVocabulary(mockBook.id);
      expect(vocabulary).toHaveLength(1);
      expect(vocabulary[0].translation).toBe('新的翻译');
    });
  });

  describe('设置管理', () => {
    const mockBook: BookMetadata = {
      id: 'test-book-settings',
      title: '设置测试书籍',
      author: '测试作者',
      format: 'epub',
      filePath: '/path/to/settings-book.epub',
      fileSize: 1024000,
      importDate: new Date(),
      totalPages: 200,
      language: 'zh-CN'
    };

    const mockReadingSettings: ReadingSettings = {
      bookId: 'test-book-settings',
      fontFamily: 'Microsoft YaHei',
      fontSize: 16,
      lineHeight: 1.5,
      margin: 20,
      theme: 'light',
      pageMode: 'pagination'
    };

    beforeEach(async () => {
      await dbService.saveBook(mockBook);
    });

    test('应该能够保存阅读设置', async () => {
      await dbService.saveSettings(mockBook.id, mockReadingSettings);
      
      const settings = await dbService.getSettings(mockBook.id);
      expect(settings).not.toBeNull();
      expect(settings!.fontFamily).toBe(mockReadingSettings.fontFamily);
      expect(settings!.fontSize).toBe(mockReadingSettings.fontSize);
    });

    test('获取不存在的设置应该返回null', async () => {
      const settings = await dbService.getSettings('non-existent-book');
      expect(settings).toBeNull();
    });

    test('应该能够覆盖已存在的设置', async () => {
      await dbService.saveSettings(mockBook.id, mockReadingSettings);
      
      const newSettings: ReadingSettings = {
        ...mockReadingSettings,
        fontSize: 20,
        theme: 'dark'
      };
      
      await dbService.saveSettings(mockBook.id, newSettings);
      
      const settings = await dbService.getSettings(mockBook.id);
      expect(settings!.fontSize).toBe(20);
      expect(settings!.theme).toBe('dark');
    });

    test('应该能够保存应用设置', async () => {
      const appSettings: AppSettings = {
        theme: 'dark',
        language: 'en-US',
        autoSave: false,
        cacheSize: 1000
      };
      
      await dbService.saveAppSettings(appSettings);
      
      const savedSettings = await dbService.getAppSettings();
      expect(savedSettings.theme).toBe('dark');
      expect(savedSettings.language).toBe('en-US');
      expect(savedSettings.autoSave).toBe(false);
      expect(savedSettings.cacheSize).toBe(1000);
    });

    test('应该返回默认应用设置', async () => {
      const settings = await dbService.getAppSettings();
      expect(settings.theme).toBe('system');
      expect(settings.language).toBe('zh-CN');
      expect(settings.autoSave).toBe(true);
      expect(settings.cacheSize).toBe(500);
    });
  });

  describe('数据库管理', () => {
    test('应该能够创建备份', async () => {
      // 添加一些测试数据
      const mockBook: BookMetadata = {
        id: 'backup-test-book',
        title: '备份测试书籍',
        author: '测试作者',
        format: 'epub',
        filePath: '/path/to/backup-book.epub',
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 200,
        language: 'zh-CN'
      };
      
      await dbService.saveBook(mockBook);
      
      const backupPath = await dbService.backup();
      expect(backupPath).toBeDefined();
      expect(fs.existsSync(backupPath)).toBe(true);
      
      // 清理备份文件
      fs.unlinkSync(backupPath);
    });

    test('数据库未初始化时应该抛出错误', async () => {
      const uninitializedService = new DatabaseService();
      
      await expect(uninitializedService.getBooks()).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR,
        message: 'Database not initialized'
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理数据库连接错误', async () => {
      await dbService.close();
      
      await expect(dbService.getBooks()).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR
      });
    });

    test('应该处理无效的书籍数据', async () => {
      const invalidBook = {
        id: 'invalid-book',
        title: 'Test',
        author: 'Test',
        format: 'invalid-format', // 无效格式
        filePath: '/path/to/book',
        fileSize: 1000,
        importDate: new Date(),
        totalPages: 100,
        language: 'zh-CN'
      } as any;

      await expect(dbService.saveBook(invalidBook)).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR
      });
    });
  });
});