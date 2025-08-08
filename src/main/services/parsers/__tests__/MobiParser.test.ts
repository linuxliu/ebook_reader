import * as fs from 'fs/promises';
import * as path from 'path';
import { MobiParser } from '../MobiParser';
import { ErrorType } from '../../../../shared/types';

describe('MobiParser', () => {
  let mobiParser: MobiParser;
  let tempDir: string;

  beforeEach(async () => {
    mobiParser = new MobiParser();
    
    // 创建临时测试目录
    tempDir = path.join(__dirname, 'temp_mobi_test');
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

  describe('validateMobiFile', () => {
    it('should validate MOBI files with correct header', async () => {
      const mobiFile = path.join(tempDir, 'test.mobi');
      // 创建一个模拟的 MOBI 文件，包含正确的文件头
      const header = Buffer.alloc(68);
      header.write('BOOKMOBI', 60, 'ascii');
      await fs.writeFile(mobiFile, header);

      const result = await mobiParser.validateMobiFile(mobiFile);
      expect(result).toBe(true);
    });

    it('should reject non-MOBI file extensions', async () => {
      const txtFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(txtFile, 'text content');

      const result = await mobiParser.validateMobiFile(txtFile);
      expect(result).toBe(false);
    });

    it('should reject files without MOBI header', async () => {
      const fakeMobi = path.join(tempDir, 'fake.mobi');
      await fs.writeFile(fakeMobi, 'not a mobi file');

      const result = await mobiParser.validateMobiFile(fakeMobi);
      expect(result).toBe(false);
    });

    it('should handle file access errors', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.mobi');
      
      const result = await mobiParser.validateMobiFile(nonExistentFile);
      expect(result).toBe(false);
    });
  });

  describe('parseMetadata', () => {
    it('should extract metadata from MOBI with embedded metadata', async () => {
      const mobiFile = path.join(tempDir, 'with-metadata.mobi');
      const content = `
        BOOKMOBI header data...
        <dc:title>Test MOBI Book</dc:title>
        <dc:creator>Test Author</dc:creator>
        <dc:language>en-US</dc:language>
        more content...
      `;
      await fs.writeFile(mobiFile, content, 'utf-8');

      const metadata = await mobiParser.parseMetadata(mobiFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'Test MOBI Book',
        author: 'Test Author',
        language: 'en-US',
        totalPages: expect.any(Number)
      });
    });

    it('should handle MOBI files without metadata', async () => {
      const mobiFile = path.join(tempDir, 'no-metadata.mobi');
      const header = Buffer.alloc(68);
      header.write('BOOKMOBI', 60, 'ascii');
      await fs.writeFile(mobiFile, header);

      const metadata = await mobiParser.parseMetadata(mobiFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'no-metadata',
        author: '未知作者',
        language: 'zh-CN',
        totalPages: expect.any(Number)
      });
    });

    it('should estimate pages based on file size', async () => {
      const mobiFile = path.join(tempDir, 'large.mobi');
      const content = 'A'.repeat(10000); // 10KB文件
      await fs.writeFile(mobiFile, content, 'utf-8');

      const metadata = await mobiParser.parseMetadata(mobiFile, 'test-book-id');

      expect(metadata.totalPages).toBeGreaterThan(1);
    });

    it('should handle parsing errors gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.mobi');

      await expect(mobiParser.parseMetadata(nonExistentFile, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('MOBI 元信息解析失败')
        });
    });
  });

  describe('parseContent', () => {
    it('should parse MOBI content and generate chapters', async () => {
      const mobiFile = path.join(tempDir, 'content.mobi');
      const content = 'A'.repeat(25000); // 25KB内容，应该生成多个章节
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      expect(result).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: expect.any(String)
      });

      // 验证章节结构
      expect(result.chapters.length).toBeGreaterThan(1);
      expect(result.chapters[0]).toMatchObject({
        id: 'mobi-chapter-1',
        title: '第 1 部分',
        content: expect.any(String),
        pageCount: expect.any(Number),
        startPage: 1
      });

      // 验证目录
      expect(result.toc).toHaveLength(result.chapters.length);
      expect(result.toc[0]).toMatchObject({
        id: 'mobi-chapter-1',
        title: '第 1 部分',
        level: 0,
        page: 1
      });
    });

    it('should handle short content as single chapter', async () => {
      const mobiFile = path.join(tempDir, 'short.mobi');
      const content = 'This is a short MOBI file content.';
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]).toMatchObject({
        id: 'mobi-chapter-1',
        title: '全文',
        pageCount: 1,
        startPage: 1
      });
    });

    it('should handle content with HTML tags', async () => {
      const mobiFile = path.join(tempDir, 'html-content.mobi');
      const content = `BOOKMOBI${'A'.repeat(200)}<html><body><h1>Chapter Title</h1><p>This is paragraph content with <b>bold</b> text.</p><p>Another paragraph with <i>italic</i> text.</p></body></html>`;
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      // HTML标签应该被移除
      expect(result.rawContent).not.toContain('<html>');
      expect(result.rawContent).not.toContain('<body>');
      expect(result.rawContent).not.toContain('<h1>');
      expect(result.rawContent).toContain('Chapter Title');
      expect(result.rawContent).toContain('paragraph content');
    });

    it('should handle files with encoding issues', async () => {
      const mobiFile = path.join(tempDir, 'encoding-issues.mobi');
      // 创建包含大量替换字符的内容
      const content = '�'.repeat(1000) + 'some readable text';
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      // 应该返回默认的错误信息而不是乱码内容
      expect(result.rawContent).toContain('MOBI 格式的电子书文件');
      expect(result.rawContent).toContain('当前版本只能提供基本的文件信息');
    });

    it('should handle content parsing errors gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.mobi');

      const result = await mobiParser.parseContent(nonExistentFile, 'test-book-id');
      
      expect(result).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: expect.stringContaining('MOBI 文件内容提取失败')
      });
    });
  });

  describe('chapter generation', () => {
    it('should split long content into multiple chapters', async () => {
      const mobiFile = path.join(tempDir, 'long-content.mobi');
      const content = 'A'.repeat(35000); // 35KB内容，应该生成4个章节
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      expect(result.chapters).toHaveLength(4);
      
      // 验证章节分页逻辑
      let expectedStartPage = 1;
      result.chapters.forEach((chapter, index) => {
        expect(chapter.startPage).toBe(expectedStartPage);
        expectedStartPage += chapter.pageCount;
        
        if (index < result.chapters.length - 1) {
          expect(chapter.title).toBe(`第 ${index + 1} 部分`);
        }
      });
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.mobi');

      try {
        await mobiParser.parseMetadata(nonExistentFile, 'test-book-id');
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

  describe('text extraction and cleaning', () => {
    it('should remove control characters', async () => {
      const mobiFile = path.join(tempDir, 'control-chars.mobi');
      const content = `BOOKMOBI\x00\x01\x02text with control chars\x7F\x1F`;
      await fs.writeFile(mobiFile, content, 'binary');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      // 控制字符应该被移除
      expect(result.rawContent).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
    });

    it('should normalize whitespace', async () => {
      const mobiFile = path.join(tempDir, 'whitespace.mobi');
      const content = `BOOKMOBI${'A'.repeat(200)}   text   with    multiple     spaces    and content`;
      await fs.writeFile(mobiFile, content, 'utf-8');

      const result = await mobiParser.parseContent(mobiFile, 'test-book-id');

      // 多余的空白字符应该被规范化（除了段落分隔符）
      expect(result.rawContent).toContain('text with multiple spaces and content');
      expect(result.rawContent).not.toMatch(/[^\n]\s{3,}/); // 不应该有3个或更多连续空格（除了换行符后）
    });
  });
});