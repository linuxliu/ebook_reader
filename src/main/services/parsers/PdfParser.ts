import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  BookMetadata, 
  BookContent, 
  Chapter, 
  TableOfContent,
  ErrorType,
  AppError 
} from '../../../shared/types';

// 动态导入 PDF.js 以避免在主进程启动时出错
let pdfjsLib: any = null;

async function getPdfLib() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      // 配置 PDF.js 的 worker
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
      } catch (error) {
        // 在测试环境中可能找不到 worker 文件，使用空字符串
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }
    } catch (error) {
      throw new Error(`Failed to load PDF.js: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return pdfjsLib;
}

/**
 * PDF 格式解析器
 * 负责解析 PDF 文件，提取元信息、文本内容和页面分割
 */
export class PdfParser {
  /**
   * 解析 PDF 文件并提取元信息
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    try {
      const pdfLib = await getPdfLib();
      const data = await fs.readFile(filePath);
      const pdf = await pdfLib.getDocument({ data }).promise;

      // 获取 PDF 元信息
      const metadata = await pdf.getMetadata();
      const info = metadata.info as any;

      // 提取基本信息
      const title = info?.Title || path.basename(filePath, '.pdf');
      const author = info?.Author || '未知作者';
      const language = this.detectLanguage(info?.Language) || 'zh-CN';
      const totalPages = pdf.numPages;

      return {
        title,
        author,
        language,
        totalPages
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `PDF 元信息解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 解析 PDF 内容，包括文本提取和页面分割
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    try {
      const pdfLib = await getPdfLib();
      const data = await fs.readFile(filePath);
      const pdf = await pdfLib.getDocument({ data }).promise;

      // 提取所有页面的文本内容
      const pages = await this.extractAllPages(pdf);
      
      // 生成章节（基于页面分组）
      const chapters = this.generateChaptersFromPages(pages);
      
      // 生成简单的目录（基于章节）
      const toc = this.generateTableOfContents(chapters);
      
      // 合并所有文本作为原始内容
      const rawContent = pages.map(page => page.text).join('\n\n');

      return {
        bookId,
        chapters,
        toc,
        rawContent
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `PDF 内容解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 验证 PDF 文件格式
   */
  async validatePdfFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件扩展名
      if (!filePath.toLowerCase().endsWith('.pdf')) {
        return false;
      }

      // 尝试读取 PDF 文件头
      const buffer = Buffer.alloc(8);
      const file = await fs.open(filePath, 'r');
      await file.read(buffer, 0, 8, 0);
      await file.close();

      // 检查 PDF 文件头标识
      const header = buffer.toString('ascii', 0, 4);
      if (header !== '%PDF') {
        return false;
      }

      // 尝试用 PDF.js 打开文件
      const pdfLib = await getPdfLib();
      const data = await fs.readFile(filePath);
      const pdf = await pdfLib.getDocument({ data }).promise;
      
      return pdf.numPages > 0;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 提取所有页面的文本内容
   */
  private async extractAllPages(pdf: any): Promise<Array<{ pageNum: number; text: string }>> {
    const pages: Array<{ pageNum: number; text: string }> = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 提取文本项并组合成字符串
        const text = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push({ pageNum, text });
      } catch (error) {
        console.warn(`Failed to extract text from page ${pageNum}:`, error);
        // 添加空页面作为占位符
        pages.push({ pageNum, text: '' });
      }
    }

    return pages;
  }

  /**
   * 从页面生成章节
   * 简单策略：每10页作为一个章节
   */
  private generateChaptersFromPages(pages: Array<{ pageNum: number; text: string }>): Chapter[] {
    const chapters: Chapter[] = [];
    const pagesPerChapter = 10;
    
    for (let i = 0; i < pages.length; i += pagesPerChapter) {
      const chapterPages = pages.slice(i, i + pagesPerChapter);
      const chapterNum = Math.floor(i / pagesPerChapter) + 1;
      
      const chapter: Chapter = {
        id: `pdf-chapter-${chapterNum}`,
        title: `第 ${chapterNum} 章`,
        content: chapterPages.map(page => page.text).join('\n\n'),
        pageCount: chapterPages.length,
        startPage: chapterPages[0]?.pageNum || 1
      };

      chapters.push(chapter);
    }

    return chapters;
  }

  /**
   * 生成目录
   */
  private generateTableOfContents(chapters: Chapter[]): TableOfContent[] {
    return chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title,
      level: 0,
      page: chapter.startPage,
      href: `#${chapter.id}`
    }));
  }

  /**
   * 检测语言
   */
  private detectLanguage(language?: string): string | undefined {
    if (!language) {
      return undefined;
    }

    // 简单的语言检测映射
    const languageMap: { [key: string]: string } = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en-US',
      'en-US': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR'
    };

    const normalizedLang = language.toLowerCase();
    return languageMap[normalizedLang] || language;
  }

  /**
   * 创建标准化的错误对象
   */
  private createError(type: ErrorType, message: string, details?: unknown): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable: true
    };
  }
}