import * as fs from 'fs/promises';
import * as path from 'path';
// @ts-ignore - epubjs doesn't have proper TypeScript definitions
import ePub from 'epubjs';
import { 
  BookMetadata, 
  BookContent, 
  Chapter, 
  TableOfContent,
  ErrorType,
  AppError 
} from '../../../shared/types';

/**
 * EPUB 格式解析器
 * 负责解析 EPUB 文件，提取元信息、目录和内容
 */
export class EpubParser {
  /**
   * 解析 EPUB 文件并提取元信息
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    try {
      const book = ePub(filePath);
      await book.ready;

      // 提取基本元信息
      const metadata = book.package.metadata;
      const title = metadata.title || path.basename(filePath, '.epub');
      const author = metadata.creator || '未知作者';
      const language = metadata.language || 'zh-CN';

      // 获取封面图片
      let cover: string | undefined;
      try {
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
          // 将封面转换为 base64 格式存储
          cover = await this.extractCoverAsBase64(book, coverUrl);
        }
      } catch (error) {
        // 封面提取失败不影响整体解析
        console.warn('Failed to extract cover:', error);
      }

      // 计算总页数（估算）
      const spine = book.spine;
      const totalPages = spine ? spine.length * 10 : 100; // 粗略估算每章10页

      return {
        title,
        author,
        cover,
        language,
        totalPages
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `EPUB 元信息解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 解析 EPUB 内容，包括章节和目录
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    try {
      const book = ePub(filePath);
      await book.ready;

      // 解析目录
      const toc = await this.parseTableOfContents(book);

      // 解析章节内容
      const chapters = await this.parseChapters(book);

      // 提取原始内容（用于搜索等功能）
      const rawContent = chapters.map(chapter => chapter.content).join('\n\n');

      return {
        bookId,
        chapters,
        toc,
        rawContent
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `EPUB 内容解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 验证 EPUB 文件格式
   */
  async validateEpubFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件扩展名
      if (!filePath.toLowerCase().endsWith('.epub')) {
        return false;
      }

      // 尝试打开 EPUB 文件
      const book = ePub(filePath);
      await book.ready;

      // 检查是否有基本的 EPUB 结构
      return !!(book.package && book.spine);
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 解析目录结构
   */
  private async parseTableOfContents(book: any): Promise<TableOfContent[]> {
    try {
      const navigation = await book.loaded.navigation;
      return this.convertNavToToc(navigation.toc, 0);
    } catch (error) {
      // 如果无法获取导航，尝试从 spine 生成简单目录
      return this.generateTocFromSpine(book);
    }
  }

  /**
   * 将导航结构转换为目录格式
   */
  private convertNavToToc(navItems: any[], level: number): TableOfContent[] {
    return navItems.map((item, index) => {
      const tocItem: TableOfContent = {
        id: `toc-${level}-${index}`,
        title: item.label || `Chapter ${index + 1}`,
        level,
        page: index + 1, // 简化的页码计算
        href: item.href
      };

      // 递归处理子目录
      if (item.subitems && item.subitems.length > 0) {
        tocItem.children = this.convertNavToToc(item.subitems, level + 1);
      }

      return tocItem;
    });
  }

  /**
   * 从 spine 生成简单目录
   */
  private generateTocFromSpine(book: any): TableOfContent[] {
    const spine = book.spine;
    if (!spine || !spine.spineItems) {
      return [];
    }

    return spine.spineItems.map((item: any, index: number) => ({
      id: `spine-${index}`,
      title: item.idref || `Chapter ${index + 1}`,
      level: 0,
      page: index + 1,
      href: item.href
    }));
  }

  /**
   * 解析章节内容
   */
  private async parseChapters(book: any): Promise<Chapter[]> {
    const chapters: Chapter[] = [];
    const spine = book.spine;

    if (!spine || !spine.spineItems) {
      return chapters;
    }

    for (let i = 0; i < spine.spineItems.length; i++) {
      const spineItem = spine.spineItems[i];
      
      try {
        // 加载章节内容
        const section = book.section(spineItem.href);
        await section.load(book.load.bind(book));
        
        // 提取文本内容
        const content = await this.extractTextContent(section);
        
        // 估算页数（基于字符数）
        const pageCount = Math.max(1, Math.ceil(content.length / 2000)); // 假设每页2000字符

        const chapter: Chapter = {
          id: spineItem.idref || `chapter-${i}`,
          title: spineItem.idref || `Chapter ${i + 1}`,
          content,
          pageCount,
          startPage: chapters.reduce((sum, ch) => sum + ch.pageCount, 1)
        };

        chapters.push(chapter);
      } catch (error) {
        console.warn(`Failed to parse chapter ${i}:`, error);
        // 创建一个空章节作为占位符
        chapters.push({
          id: `chapter-${i}`,
          title: `Chapter ${i + 1}`,
          content: '',
          pageCount: 1,
          startPage: chapters.reduce((sum, ch) => sum + ch.pageCount, 1)
        });
      }
    }

    return chapters;
  }

  /**
   * 从章节中提取纯文本内容
   */
  private async extractTextContent(section: any): Promise<string> {
    try {
      // 获取章节的 HTML 内容
      const document = section.document;
      if (!document) {
        return '';
      }

      // 提取文本内容，移除 HTML 标签
      const textContent = document.body ? document.body.textContent || document.body.innerText : '';
      
      // 清理文本：移除多余的空白字符
      return textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    } catch (error) {
      console.warn('Failed to extract text content:', error);
      return '';
    }
  }

  /**
   * 提取封面图片并转换为 base64
   */
  private async extractCoverAsBase64(book: any, coverUrl: string): Promise<string> {
    try {
      // 这里需要根据 epubjs 的实际 API 来实现
      // 由于 epubjs 在 Node.js 环境中的限制，可能需要特殊处理
      
      // 暂时返回空字符串，后续可以改进
      return '';
    } catch (error) {
      console.warn('Failed to extract cover as base64:', error);
      return '';
    }
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