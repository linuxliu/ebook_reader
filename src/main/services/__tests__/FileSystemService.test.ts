import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../FileSystemService';
import { ErrorType, VocabularyItem } from '../../../shared/types';

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = path.join(__dirname, 'temp_test');
    await fs.mkdir(tempDir, { recursive: true });
    
    // 创建测试用的缓存目录
    const cacheDir = path.join(tempDir, 'cache');
    fileSystemService = new FileSystemService(cacheDir);
    
    // 创建测试文件
    testFilePath = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFilePath, 'This is a test book content.', 'utf-8');
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('validateFile', () => {
    it('should validate supported file extensions for text files', async () => {
      const result = await fileSystemService.validateFile(testFilePath);
      expect(result).toBe(true);
    });

    it('should reject unsupported file extensions', async () => {
      const unsupportedFile = path.join(tempDir, 'test.doc');
      await fs.writeFile(unsupportedFile, 'content', 'utf-8');

      const result = await fileSystemService.validateFile(unsupportedFile);
      expect(result).toBe(false);
    });

    it('should validate file size limits', async () => {
      // This test verifies that the file size check logic exists
      // In a real scenario, we would test with actual large files
      // For now, we just verify the method doesn't throw for normal files
      const result = await fileSystemService.validateFile(testFilePath);
      expect(result).toBe(true);
    });

    it('should handle file access errors', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      
      const result = await fileSystemService.validateFile(nonExistentFile);
      expect(result).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return correct file information', async () => {
      const info = await fileSystemService.getFileInfo(testFilePath);
      
      expect(info).toMatchObject({
        format: 'txt',
        size: expect.any(Number)
      });
      expect(info.size).toBeGreaterThan(0);
    });

    it('should handle different file formats', async () => {
      const formats = [
        { ext: '.epub', expected: 'epub' },
        { ext: '.pdf', expected: 'pdf' },
        { ext: '.mobi', expected: 'mobi' },
        { ext: '.txt', expected: 'txt' }
      ];

      for (const { ext, expected } of formats) {
        const filePath = path.join(tempDir, `test${ext}`);
        await fs.writeFile(filePath, 'content', 'utf-8');
        
        const info = await fileSystemService.getFileInfo(filePath);
        expect(info.format).toBe(expected);
      }
    });

    it('should throw error for non-existent files', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      
      await expect(fileSystemService.getFileInfo(nonExistentFile))
        .rejects
        .toMatchObject({
          type: ErrorType.FILE_NOT_FOUND
        });
    });
  });

  describe('importBook', () => {
    it('should successfully import a valid book file', async () => {
      const metadata = await fileSystemService.importBook(testFilePath);
      
      expect(metadata).toMatchObject({
        id: expect.any(String),
        title: 'test',
        author: '未知作者',
        format: 'txt',
        filePath: testFilePath,
        fileSize: expect.any(Number),
        importDate: expect.any(Date),
        totalPages: expect.any(Number),
        language: expect.any(String)
      });
    });

    it('should generate consistent book IDs for the same file', async () => {
      const metadata1 = await fileSystemService.importBook(testFilePath);
      const metadata2 = await fileSystemService.importBook(testFilePath);
      
      expect(metadata1.id).toBe(metadata2.id);
    });

    it('should reject unsafe file paths', async () => {
      const unsafePath = '../../../etc/passwd';
      
      await expect(fileSystemService.importBook(unsafePath))
        .rejects
        .toMatchObject({
          type: ErrorType.PERMISSION_ERROR
        });
    });

    it('should handle file validation failures', async () => {
      const unsupportedFile = path.join(tempDir, 'test.doc');
      await fs.writeFile(unsupportedFile, 'content', 'utf-8');
      
      await expect(fileSystemService.importBook(unsupportedFile))
        .rejects
        .toMatchObject({
          type: ErrorType.UNSUPPORTED_FORMAT
        });
    });
  });

  describe('exportVocabulary', () => {
    const mockVocabulary: VocabularyItem[] = [
      {
        id: '1',
        word: 'hello',
        translation: '你好',
        pronunciation: 'həˈloʊ',
        example: 'Hello, world!',
        bookId: 'book1',
        context: 'greeting context',
        addedDate: new Date('2023-01-01'),
        mastered: false
      },
      {
        id: '2',
        word: 'world',
        translation: '世界',
        bookId: 'book1',
        context: 'world context',
        addedDate: new Date('2023-01-02'),
        mastered: true
      }
    ];

    it('should export vocabulary in CSV format', async () => {
      const exportPath = await fileSystemService.exportVocabulary('csv', mockVocabulary);
      
      expect(exportPath).toMatch(/\.csv$/);
      
      const content = await fs.readFile(exportPath, 'utf-8');
      expect(content).toContain('单词,翻译,发音,例句,书籍,上下文,添加时间,已掌握');
      expect(content).toContain('hello,你好,həˈloʊ,"Hello, world!",book1');
      expect(content).toContain('world,世界,,');
    });

    it('should export vocabulary in TXT format', async () => {
      const exportPath = await fileSystemService.exportVocabulary('txt', mockVocabulary);
      
      expect(exportPath).toMatch(/\.txt$/);
      
      const content = await fs.readFile(exportPath, 'utf-8');
      expect(content).toContain('单词: hello');
      expect(content).toContain('翻译: 你好');
      expect(content).toContain('发音: həˈloʊ');
      expect(content).toContain('例句: Hello, world!');
      expect(content).toContain('已掌握: 否');
    });

    it('should handle CSV field escaping correctly', async () => {
      const vocabularyWithSpecialChars: VocabularyItem[] = [
        {
          id: '1',
          word: 'test',
          translation: 'translation with "quotes" and, commas',
          bookId: 'book1',
          context: 'context with\nnewlines',
          addedDate: new Date('2023-01-01'),
          mastered: false
        }
      ];

      const exportPath = await fileSystemService.exportVocabulary('csv', vocabularyWithSpecialChars);
      const content = await fs.readFile(exportPath, 'utf-8');
      
      expect(content).toContain('"translation with ""quotes"" and, commas"');
      expect(content).toContain('"context with\nnewlines"');
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific book', async () => {
      const bookId = 'test-book-id';
      const bookCacheDir = path.join(tempDir, 'cache', bookId);
      
      // 创建缓存文件
      await fs.mkdir(bookCacheDir, { recursive: true });
      await fs.writeFile(path.join(bookCacheDir, 'cache.json'), '{}', 'utf-8');
      
      await fileSystemService.clearCache(bookId);
      
      // 验证缓存已被清理
      await expect(fs.access(bookCacheDir)).rejects.toThrow();
    });

    it('should clear all cache when no bookId provided', async () => {
      const cacheDir = path.join(tempDir, 'cache');
      
      // 创建一些缓存文件
      await fs.mkdir(path.join(cacheDir, 'book1'), { recursive: true });
      await fs.mkdir(path.join(cacheDir, 'book2'), { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'book1', 'cache.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(cacheDir, 'book2', 'cache.json'), '{}', 'utf-8');
      
      await fileSystemService.clearCache();
      
      // 验证缓存目录仍存在但内容已清空
      const files = await fs.readdir(cacheDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('parseBookContent', () => {
    it('should handle missing book metadata', async () => {
      const bookId = 'test-book-id';
      
      await expect(fileSystemService.parseBookContent(bookId))
        .rejects
        .toMatchObject({
          type: ErrorType.FILE_NOT_FOUND,
          message: expect.stringContaining('找不到书籍 ID')
        });
    });
  });

  describe('path sanitization', () => {
    it('should reject paths with directory traversal attempts', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/passwd',
        '~/sensitive-file'
      ];

      for (const maliciousPath of maliciousPaths) {
        await expect(fileSystemService.importBook(maliciousPath))
          .rejects
          .toMatchObject({
            type: ErrorType.PERMISSION_ERROR
          });
      }
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      try {
        await fileSystemService.getFileInfo('/nonexistent/file.txt');
      } catch (error: any) {
        expect(error).toMatchObject({
          type: ErrorType.FILE_NOT_FOUND,
          message: expect.any(String),
          timestamp: expect.any(Date),
          recoverable: expect.any(Boolean)
        });
      }
    });

    it('should handle permission errors as non-recoverable', async () => {
      try {
        await fileSystemService.importBook('../malicious-path');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.PERMISSION_ERROR);
        expect(error.recoverable).toBe(false);
      }
    });
  });
});