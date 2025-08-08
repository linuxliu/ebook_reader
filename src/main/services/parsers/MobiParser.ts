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

/**
 * MOBI 格式解析器
 * 提供基本的 MOBI 文件解析功能
 * 注意：这是一个简化的实现，完整的 MOBI 解析需要更复杂的逻辑
 */
export class MobiParser {
  /**
   * 解析 MOBI 文件并提取元信息
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    try {
      // 读取 MOBI 文件头
      const header = await this.readMobiHeader(filePath);
      
      // 提取基本信息
      const title = header.title || path.basename(filePath, '.mobi');
      const author = header.author || '未知作者';
      const language = header.language || 'zh-CN';
      
      // 估算页数（基于文件大小）
      const stats = await fs.stat(filePath);
      const totalPages = Math.max(1, Math.ceil(stats.size / 2000)); // 粗略估算

      return {
        title,
        author,
        language,
        totalPages
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `MOBI 元信息解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 解析 MOBI 内容
   * 注意：这是一个简化的实现，实际的 MOBI 解析需要处理 PalmDOC 压缩等复杂格式
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    try {
      // 尝试提取文本内容
      const textContent = await this.extractTextContent(filePath);
      
      // 生成简单的章节结构
      const chapters = this.generateChaptersFromText(textContent);
      
      // 生成目录
      const toc = this.generateTableOfContents(chapters);

      return {
        bookId,
        chapters,
        toc,
        rawContent: textContent
      };
    } catch (error) {
      // 对于 MOBI 解析失败，返回一个基本的结构而不是抛出错误
      const fallbackContent = `MOBI 文件内容提取失败: ${error instanceof Error ? error.message : '未知错误'}`;
      return {
        bookId,
        chapters: [{
          id: 'mobi-chapter-1',
          title: '全文',
          content: fallbackContent,
          pageCount: 1,
          startPage: 1
        }],
        toc: [{
          id: 'mobi-chapter-1',
          title: '全文',
          level: 0,
          page: 1,
          href: '#mobi-chapter-1'
        }],
        rawContent: fallbackContent
      };
    }
  }

  /**
   * 验证 MOBI 文件格式
   */
  async validateMobiFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件扩展名
      if (!filePath.toLowerCase().endsWith('.mobi')) {
        return false;
      }

      // 检查 MOBI 文件头
      const buffer = Buffer.alloc(68);
      const file = await fs.open(filePath, 'r');
      await file.read(buffer, 0, 68, 0);
      await file.close();

      // 检查 PalmDOC 头标识
      const palmDocHeader = buffer.toString('ascii', 60, 68);
      return palmDocHeader === 'BOOKMOBI' || palmDocHeader.includes('MOBI');
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 读取 MOBI 文件头信息
   */
  private async readMobiHeader(filePath: string): Promise<{
    title?: string;
    author?: string;
    language?: string;
  }> {
    try {
      // 这是一个简化的实现
      // 实际的 MOBI 头解析需要处理复杂的二进制格式
      const buffer = await fs.readFile(filePath);
      
      // 尝试从文件中提取可读的文本信息
      const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
      
      // 使用简单的模式匹配提取信息
      const titleMatch = text.match(/<dc:title>([^<]+)<\/dc:title>/i);
      const authorMatch = text.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      const languageMatch = text.match(/<dc:language>([^<]+)<\/dc:language>/i);

      return {
        title: titleMatch ? titleMatch[1] : undefined,
        author: authorMatch ? authorMatch[1] : undefined,
        language: languageMatch ? languageMatch[1] : undefined
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 提取文本内容
   */
  private async extractTextContent(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      
      // 这是一个非常简化的文本提取方法
      // 实际的 MOBI 文件需要处理 PalmDOC 压缩和 HTML 格式
      
      // 尝试找到文本内容的开始位置
      let textStart = 0;
      const mobiHeaderIndex = buffer.indexOf('MOBI');
      if (mobiHeaderIndex !== -1) {
        // 跳过 MOBI 头部，寻找文本内容
        textStart = mobiHeaderIndex + 200; // 粗略估算头部大小
      }
      
      // 提取可能的文本内容
      const textBuffer = buffer.subarray(textStart);
      let text = textBuffer.toString('utf-8');
      
      // 清理文本：移除 HTML 标签和控制字符
      text = text
        .replace(/<[^>]+>/g, '') // 移除 HTML 标签
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
        .replace(/\s+/g, ' ') // 规范化空白字符
        .replace(/\n\s*\n/g, '\n\n') // 保留段落分隔但规范化
        .trim();
      
      // 如果提取的文本太短或包含太多乱码，返回基本信息
      if (text.length < 30 || this.hasEncodingIssues(text)) {
        return `这是一个 MOBI 格式的电子书文件。\n\n由于 MOBI 格式的复杂性，当前版本只能提供基本的文件信息。\n\n建议使用专门的 MOBI 阅读器来获得更好的阅读体验。`;
      }
      
      return text;
    } catch (error) {
      return `MOBI 文件内容提取失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 检查是否有编码问题
   */
  private hasEncodingIssues(text: string): boolean {
    const replacementCharCount = (text.match(/�/g) || []).length;
    return replacementCharCount > text.length * 0.05; // 如果替换字符超过5%
  }

  /**
   * 从文本生成章节
   */
  private generateChaptersFromText(text: string): Chapter[] {
    const chapterSize = 10000; // 每章10000字符
    const chapters: Chapter[] = [];
    
    if (text.length <= chapterSize) {
      // 如果文本较短，作为单个章节
      return [{
        id: 'mobi-chapter-1',
        title: '全文',
        content: text,
        pageCount: Math.max(1, Math.ceil(text.length / 2000)),
        startPage: 1
      }];
    }
    
    // 分割为多个章节
    let chapterNum = 1;
    for (let i = 0; i < text.length; i += chapterSize) {
      const chapterContent = text.substring(i, i + chapterSize).trim();
      
      if (chapterContent.length > 0) {
        const pageCount = Math.max(1, Math.ceil(chapterContent.length / 2000));
        
        chapters.push({
          id: `mobi-chapter-${chapterNum}`,
          title: `第 ${chapterNum} 部分`,
          content: chapterContent,
          pageCount,
          startPage: chapters.reduce((sum, ch) => sum + ch.pageCount, 1)
        });
        
        chapterNum++;
      }
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