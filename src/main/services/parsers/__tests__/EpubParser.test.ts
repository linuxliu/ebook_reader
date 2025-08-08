import * as fs from 'fs/promises';
import * as path from 'path';
import { EpubParser } from '../EpubParser';
import { ErrorType } from '../../../../shared/types';

// Mock epubjs since we don't have actual EPUB files for testing
jest.mock('epubjs', () => {
  return jest.fn().mockImplementation((filePath: string) => {
    // Mock different behaviors based on file path
    if (filePath.includes('invalid')) {
      throw new Error('Invalid EPUB file');
    }
    
    if (filePath.includes('no-metadata')) {
      return {
        ready: Promise.resolve(),
        package: {
          metadata: {}
        },
        spine: {
          length: 5,
          spineItems: []
        },
        loaded: {
          navigation: Promise.resolve({ toc: [] })
        },
        coverUrl: () => Promise.resolve(null),
        section: () => ({
          load: (loadFn: any) => Promise.resolve(),
          document: {
            body: {
              textContent: 'Sample chapter content'
            }
          }
        }),
        load: {
          bind: () => () => Promise.resolve()
        }
      };
    }
    
    // Default mock for valid EPUB
    return {
      ready: Promise.resolve(),
      package: {
        metadata: {
          title: 'Test Book',
          creator: 'Test Author',
          language: 'en'
        }
      },
      spine: {
        length: 3,
        spineItems: [
          { idref: 'chapter1', href: 'chapter1.xhtml' },
          { idref: 'chapter2', href: 'chapter2.xhtml' },
          { idref: 'chapter3', href: 'chapter3.xhtml' }
        ]
      },
      loaded: {
        navigation: Promise.resolve({
          toc: [
            { label: 'Chapter 1', href: 'chapter1.xhtml' },
            { label: 'Chapter 2', href: 'chapter2.xhtml', subitems: [
              { label: 'Section 2.1', href: 'chapter2.xhtml#section1' }
            ]},
            { label: 'Chapter 3', href: 'chapter3.xhtml' }
          ]
        })
      },
      coverUrl: () => Promise.resolve('cover.jpg'),
      section: (href: string) => ({
        load: (loadFn: any) => Promise.resolve(),
        document: {
          body: {
            textContent: `Sample content for ${href}`
          }
        }
      }),
      load: {
        bind: () => () => Promise.resolve()
      }
    };
  });
});

describe('EpubParser', () => {
  let epubParser: EpubParser;
  let tempDir: string;

  beforeEach(async () => {
    epubParser = new EpubParser();
    
    // 创建临时测试目录
    tempDir = path.join(__dirname, 'temp_epub_test');
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

  describe('validateEpubFile', () => {
    it('should validate EPUB file extension', async () => {
      const epubFile = path.join(tempDir, 'test.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const result = await epubParser.validateEpubFile(epubFile);
      expect(result).toBe(true);
    });

    it('should reject non-EPUB file extensions', async () => {
      const txtFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(txtFile, 'text content');

      const result = await epubParser.validateEpubFile(txtFile);
      expect(result).toBe(false);
    });

    it('should handle invalid EPUB files', async () => {
      const invalidEpub = path.join(tempDir, 'invalid.epub');
      await fs.writeFile(invalidEpub, 'not an epub');

      const result = await epubParser.validateEpubFile(invalidEpub);
      expect(result).toBe(false);
    });
  });

  describe('parseMetadata', () => {
    it('should extract basic metadata from EPUB', async () => {
      const epubFile = path.join(tempDir, 'test.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const metadata = await epubParser.parseMetadata(epubFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        totalPages: expect.any(Number)
      });
    });

    it('should handle EPUB files without metadata', async () => {
      const epubFile = path.join(tempDir, 'no-metadata.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const metadata = await epubParser.parseMetadata(epubFile, 'test-book-id');

      expect(metadata).toMatchObject({
        title: 'no-metadata',
        author: '未知作者',
        language: 'zh-CN',
        totalPages: expect.any(Number)
      });
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidEpub = path.join(tempDir, 'invalid.epub');
      await fs.writeFile(invalidEpub, 'not an epub');

      await expect(epubParser.parseMetadata(invalidEpub, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('EPUB 元信息解析失败')
        });
    });
  });

  describe('parseContent', () => {
    it('should parse EPUB content with chapters and TOC', async () => {
      const epubFile = path.join(tempDir, 'test.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const content = await epubParser.parseContent(epubFile, 'test-book-id');

      expect(content).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: expect.any(String)
      });

      // 验证章节结构
      expect(content.chapters).toHaveLength(3);
      content.chapters.forEach(chapter => {
        expect(chapter).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          content: expect.any(String),
          pageCount: expect.any(Number),
          startPage: expect.any(Number)
        });
      });

      // 验证目录结构
      expect(content.toc).toHaveLength(3);
      expect(content.toc[1]).toMatchObject({
        id: expect.any(String),
        title: 'Chapter 2',
        level: 0,
        page: 2,
        href: 'chapter2.xhtml',
        children: expect.any(Array)
      });

      // 验证子目录
      expect(content.toc[1].children).toHaveLength(1);
      expect(content.toc[1].children![0]).toMatchObject({
        title: 'Section 2.1',
        level: 1
      });
    });

    it('should handle EPUB files without navigation', async () => {
      const epubFile = path.join(tempDir, 'no-metadata.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const content = await epubParser.parseContent(epubFile, 'test-book-id');

      expect(content).toMatchObject({
        bookId: 'test-book-id',
        chapters: expect.any(Array),
        toc: expect.any(Array),
        rawContent: expect.any(String)
      });
    });

    it('should handle content parsing errors', async () => {
      const invalidEpub = path.join(tempDir, 'invalid.epub');
      await fs.writeFile(invalidEpub, 'not an epub');

      await expect(epubParser.parseContent(invalidEpub, 'test-book-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.PARSE_ERROR,
          message: expect.stringContaining('EPUB 内容解析失败')
        });
    });

    it('should generate raw content from chapters', async () => {
      const epubFile = path.join(tempDir, 'test.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const content = await epubParser.parseContent(epubFile, 'test-book-id');

      expect(content.rawContent).toBeTruthy();
      expect(content.rawContent).toContain('Sample content');
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      const invalidEpub = path.join(tempDir, 'invalid.epub');
      await fs.writeFile(invalidEpub, 'not an epub');

      try {
        await epubParser.parseMetadata(invalidEpub, 'test-book-id');
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

  describe('page calculation', () => {
    it('should estimate page counts for chapters', async () => {
      const epubFile = path.join(tempDir, 'test.epub');
      await fs.writeFile(epubFile, 'mock epub content');

      const content = await epubParser.parseContent(epubFile, 'test-book-id');

      // 验证页数计算
      let expectedStartPage = 1;
      content.chapters.forEach(chapter => {
        expect(chapter.startPage).toBe(expectedStartPage);
        expect(chapter.pageCount).toBeGreaterThan(0);
        expectedStartPage += chapter.pageCount;
      });
    });
  });
});