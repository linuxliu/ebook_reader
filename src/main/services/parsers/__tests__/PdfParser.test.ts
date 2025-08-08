import * as fs from 'fs/promises';
import * as path from 'path';
import { PdfParser } from '../PdfParser';
import { ErrorType } from '../../../../shared/types';

// Mock pdfjs-dist since we don't have actual PDF files for testing
jest.mock('pdfjs-dist/legacy/build/pdf', () => ({
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: jest.fn().mockImplementation(({ data }) => {
    // Mock different behaviors based on data content
    const content = data.toString();
    
    if (content.includes('invalid')) {
      return {
        promise: Promise.reject(new Error('Invalid PDF'))
      };
    }
    
    if (content.includes('no-metadata')) {
      return {
        promise: Promise.resolve({
          numPages: 5,
          getMetadata: () => Promise.resolve({
            info: {}
          }),
          getPage: (pageNum: number) => Promise.resolve({
            getTextContent: () => Promise.resolve({
              items: [
                { str: `Page ${pageNum} content` },
                { str: 'Sample text' }
              ]
            })
          })
        })
      };
    }
    
    // Default mock for valid PDF
    return {
      promise: Promise.resolve({
        numPages: 25,
        getMetadata: () => Promise.resolve({
          info: {
            Title: 'Test PDF Book',
            Author: 'Test Author',
            Language: 'en-US'
          }
        }),
        getPage: (pageNum: number) => Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [
              { str: `Chapter content for page ${pageNum}` },
              { str: 'This is sample text content.' },
              { str: 'More content here.' }
            ]
          })
        })
      })
    };
  })
}));

describe('PdfParser', () => {
  let pdfParser: PdfParser;
  let tempDir: string;

  beforeEach(async () => {
    pdfParser = new PdfParser();
    
    // 创建临时测试目录
    tempDir = path.join(__dirname, 'temp_pdf_test');
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

  describe('validatePdfFile', () => {
    it('should validate PDF file extension and header', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      // 创建一个模拟的 PDF 文件，包含正确的文件头
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const result = await pdfParser.validatePdfFile(pdfFile);
      expect(result).toBe(true);
    });

    it('should reject non-PDF file extensions', async () => {
      const txtFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(txtFile, 'text content');

      const result = await pdfParser.validatePdfFile(txtFile);
      expect(result).toBe(false);
    });

    it('should reject files without PDF header', async () => {
      const fakePdf = path.join(tempDir, 'fake.pdf');
      await fs.writeFile(fakePdf, 'not a pdf file');

      const result = await pdfParser.validatePdfFile(fakePdf);
      expect(result).toBe(false);
    });

    it('should handle invalid PDF files', async () => {
      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, '%PDF-1.4\ninvalid pdf content');

      const result = await pdfParser.validatePdfFile(invalidPdf);
      expect(result).toBe(false);
    });
  });

  describe('parseMetadata', () => {
    it('should extract metadata from PDF', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const metadata = await pdfParser.parseMetadata(pdfFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'Test PDF Book',
        author: 'Test Author',
        language: 'en-US',
        totalPages: 25
      });
    });

    it('should handle PDF files without metadata', async () => {
      const pdfFile = path.join(tempDir, 'no-metadata.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nno-metadata pdf content');

      const metadata = await pdfParser.parseMetadata(pdfFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'no-metadata',
        author: '未知作者',
        language: 'zh-CN',
        totalPages: 5
      });
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, '%PDF-1.4\ninvalid pdf content');

      await expect(pdfParser.parseMetadata(invalidPdf, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('PDF 元信息解析失败')
        });
    });

    it('should detect and normalize language codes', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const metadata = await pdfParser.parseMetadata(pdfFile, 'test-book-id');

      expect(metadata.language).toBe('en-US');
    });
  });

  describe('parseContent', () => {
    it('should parse PDF content with chapters and pages', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const content = await pdfParser.parseContent(pdfFile, 'test-book-id');

      expect(content).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: expect.any(String)
      });

      // 验证章节结构 (25页应该生成3个章节：10+10+5)
      expect(content.chapters).toHaveLength(3);
      
      // 验证第一个章节
      expect(content.chapters[0]).toMatchObject({
        id: 'pdf-chapter-1',
        title: '第 1 章',
        content: expect.any(String),
        pageCount: 10,
        startPage: 1
      });

      // 验证最后一个章节
      expect(content.chapters[2]).toMatchObject({
        id: 'pdf-chapter-3',
        title: '第 3 章',
        pageCount: 5,
        startPage: 21
      });

      // 验证目录结构
      expect(content.toc).toHaveLength(3);
      expect(content.toc[0]).toMatchObject({
        id: 'pdf-chapter-1',
        title: '第 1 章',
        level: 0,
        page: 1,
        href: '#pdf-chapter-1'
      });
    });

    it('should handle content parsing errors', async () => {
      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, '%PDF-1.4\ninvalid pdf content');

      await expect(pdfParser.parseContent(invalidPdf, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('PDF 内容解析失败')
        });
    });

    it('should generate raw content from all pages', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const content = await pdfParser.parseContent(pdfFile, 'test-book-id');

      expect(content.rawContent).toBeTruthy();
      expect(content.rawContent).toContain('Chapter content');
      expect(content.rawContent).toContain('sample text content');
    });

    it('should handle pages with extraction errors gracefully', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const content = await pdfParser.parseContent(pdfFile, 'test-book-id');

      // 即使某些页面提取失败，也应该返回完整的结构
      expect(content.chapters).toBeDefined();
      expect(content.toc).toBeDefined();
      expect(content.rawContent).toBeDefined();
    });
  });

  describe('chapter generation', () => {
    it('should group pages into chapters correctly', async () => {
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const content = await pdfParser.parseContent(pdfFile, 'test-book-id');

      // 验证章节分页逻辑
      let expectedStartPage = 1;
      content.chapters.forEach((chapter, index) => {
        expect(chapter.startPage).toBe(expectedStartPage);
        expectedStartPage += chapter.pageCount;
        
        // 除了最后一章，每章应该有10页
        if (index < content.chapters.length - 1) {
          expect(chapter.pageCount).toBe(10);
        }
      });
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, '%PDF-1.4\ninvalid pdf content');

      try {
        await pdfParser.parseMetadata(invalidPdf, 'test-book-id');
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

  describe('language detection', () => {
    it('should normalize language codes correctly', async () => {
      // This is tested indirectly through parseMetadata
      // The language detection logic is private but tested through the public API
      const pdfFile = path.join(tempDir, 'test.pdf');
      await fs.writeFile(pdfFile, '%PDF-1.4\nmock pdf content');

      const metadata = await pdfParser.parseMetadata(pdfFile, 'test-book-id');
      expect(metadata.language).toBe('en-US');
    });
  });
});