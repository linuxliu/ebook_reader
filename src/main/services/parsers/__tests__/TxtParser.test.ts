import * as fs from 'fs/promises';
import * as path from 'path';
import { TxtParser } from '../TxtParser';
import { ErrorType } from '../../../../shared/types';

describe('TxtParser', () => {
  let txtParser: TxtParser;
  let tempDir: string;

  beforeEach(async () => {
    txtParser = new TxtParser();
    
    // 创建临时测试目录
    tempDir = path.join(__dirname, 'temp_txt_test');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('validateTxtFile', () => {
    it('should validate text files', async () => {
      const txtFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(txtFile, 'This is a test text file content.', 'utf-8');

      const result = await txtParser.validateTxtFile(txtFile);
      expect(result).toBe(true);
    });

    it('should reject non-TXT file extensions', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, 'content');

      const result = await txtParser.validateTxtFile(pdfFile);
      expect(result).toBe(false);
    });

    it('should reject binary files with .txt extension', async () => {
      const binaryFile = path.join(tempDir, 'binary.txt');
      // 创建包含大量二进制字符的文件
      const binaryContent = Buffer.from(Array(1000).fill(0).map(() => Math.floor(Math.random() * 32)));
      await fs.writeFile(binaryFile, binaryContent);

      const result = await txtParser.validateTxtFile(binaryFile);
      expect(result).toBe(false);
    });

    it('should handle file access errors', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      
      const result = await txtParser.validateTxtFile(nonExistentFile);
      expect(result).toBe(false);
    });
  });

  describe('parseMetadata', () => {
    it('should extract basic metadata from text file', async () => {
      const txtFile = path.join(tempDir, 'sample-book.txt');
      const content = `作者：张三\n\n这是一本测试书籍的内容。\n\n第一章\n\n这里是第一章的内容...`;
      await fs.writeFile(txtFile, content, 'utf-8');

      const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'sample-book',
        author: '张三',
        language: 'zh-CN',
        totalPages: expect.any(Number)
      });
    });

    it('should handle files without author information', async () => {
      const txtFile = path.join(tempDir, 'no-author.txt');
      const content = 'This is a book without author information.';
      await fs.writeFile(txtFile, content, 'utf-8');

      const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'no-author',
        author: '未知作者',
        language: 'en-US',
        totalPages: 1
      });
    });

    it('should detect Chinese language', async () => {
      const txtFile = path.join(tempDir, 'chinese.txt');
      const content = '这是一本中文书籍。内容包含大量的中文字符，用于测试语言检测功能。';
      await fs.writeFile(txtFile, content, 'utf-8');

      const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');

      expect(metadata.language).toBe('zh-CN');
    });

    it('should detect Japanese language', async () => {
      const txtFile = path.join(tempDir, 'japanese.txt');
      const content = 'これは日本語のテストです。ひらがなとカタカナが含まれています。';
      await fs.writeFile(txtFile, content, 'utf-8');

      const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');

      expect(metadata.language).toBe('ja-JP');
    });

    it('should handle parsing errors gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');

      await expect(txtParser.parseMetadata(nonExistentFile, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('TXT 元信息解析失败')
        });
    });
  });

  describe('parseContent', () => {
    it('should parse content with chapter markers', async () => {
      const txtFile = path.join(tempDir, 'chapters.txt');
      const content = `第一章 开始\n\n这是第一章的内容...\n\n第二章 继续\n\n这是第二章的内容...\n\n第三章 结束\n\n这是第三章的内容...`;
      await fs.writeFile(txtFile, content, 'utf-8');

      const result = await txtParser.parseContent(txtFile, 'test-book-id');

      expect(result).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: content
      });

      // 验证章节解析
      expect(result.chapters).toHaveLength(3);
      expect(result.chapters[0]).toMatchObject({
        id: 'txt-chapter-1',
        title: '第一章 开始',
        content: expect.stringContaining('第一章 开始'),
        pageCount: expect.any(Number),
        startPage: 1
      });

      // 验证目录
      expect(result.toc).toHaveLength(3);
      expect(result.toc[0]).toMatchObject({
        id: 'txt-chapter-1',
        title: '第一章 开始',
        level: 0,
        page: 1
      });
    });

    it('should handle content without chapter markers', async () => {
      const txtFile = path.join(tempDir, 'no-chapters.txt');
      const content = 'A'.repeat(50000); // 长文本，会被分割为多个章节
      await fs.writeFile(txtFile, content, 'utf-8');

      const result = await txtParser.parseContent(txtFile, 'test-book-id');

      expect(result.chapters.length).toBeGreaterThan(1);
      expect(result.chapters[0].title).toBe('第 1 章');
      expect(result.chapters[1].title).toBe('第 2 章');
    });

    it('should handle short content as single chapter', async () => {
      const txtFile = path.join(tempDir, 'short.txt');
      const content = 'This is a short text file.';
      await fs.writeFile(txtFile, content, 'utf-8');

      const result = await txtParser.parseContent(txtFile, 'test-book-id');

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]).toMatchObject({
        id: 'txt-chapter-1',
        title: '全文',
        content,
        pageCount: 1,
        startPage: 1
      });
    });

    it('should handle English chapter markers', async () => {
      const txtFile = path.join(tempDir, 'english-chapters.txt');
      const content = `Chapter 1\n\nThis is chapter one content...\n\nChapter 2\n\nThis is chapter two content...`;
      await fs.writeFile(txtFile, content, 'utf-8');

      const result = await txtParser.parseContent(txtFile, 'test-book-id');

      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].title).toBe('Chapter 1');
      expect(result.chapters[1].title).toBe('Chapter 2');
    });

    it('should handle content parsing errors', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');

      await expect(txtParser.parseContent(nonExistentFile, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('TXT 内容解析失败')
        });
    });
  });

  describe('author extraction', () => {
    it('should extract author from various patterns', async () => {
      const patterns = [
        { content: '作者：李四\n\n正文内容...', expectedAuthor: '李四' },
        { content: '著:王五\n\n正文内容...', expectedAuthor: '王五' },
        { content: 'Author: John Doe\n\nContent...', expectedAuthor: 'John Doe' },
        { content: 'By: Jane Smith\n\nContent...', expectedAuthor: 'Jane Smith' }
      ];

      for (const { content, expectedAuthor } of patterns) {
        const txtFile = path.join(tempDir, `author-test-${Date.now()}.txt`);
        await fs.writeFile(txtFile, content, 'utf-8');

        const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');
        expect(metadata.author).toBe(expectedAuthor);

        // 清理测试文件
        await fs.unlink(txtFile);
      }
    });
  });

  describe('page calculation', () => {
    it('should calculate pages correctly', async () => {
      const txtFile = path.join(tempDir, 'page-test.txt');
      const content = 'A'.repeat(5000); // 5000字符，应该是3页（每页2000字符）
      await fs.writeFile(txtFile, content, 'utf-8');

      const metadata = await txtParser.parseMetadata(txtFile, 'test-book-id');
      expect(metadata.totalPages).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');

      try {
        await txtParser.parseMetadata(nonExistentFile, 'test-book-id');
      } catch (error: any) {
        expect(error).toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.any(String),
          timestamp: expect.any(Date),
          recoverable: true
        });
      }
    });
  });
});