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
 * TXT 格式解析器
 * 负责解析文本文件，提取内容并进行编码检测
 */
export class TxtParser {
  private readonly charsPerPage = 2000; // 每页字符数
  private readonly charsPerChapter = 20000; // 每章字符数

  /**
   * 解析 TXT 文件并提取元信息
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    try {
      // 检测文件编码并读取内容
      const content = await this.readTextFileWithEncoding(filePath);
      
      // 从文件名提取标题
      const title = path.basename(filePath, '.txt');
      
      // 尝试从内容中提取作者信息（简单启发式方法）
      const author = this.extractAuthorFromContent(content) || '未知作者';
      
      // 检测语言
      const language = this.detectLanguage(content);
      
      // 计算总页数
      const totalPages = Math.max(1, Math.ceil(content.length / this.charsPerPage));

      return {
        title,
        author,
        language,
        totalPages
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `TXT 元信息解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 解析 TXT 内容，包括章节分割
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    try {
      // 检测文件编码并读取内容
      const content = await this.readTextFileWithEncoding(filePath);
      
      // 分割章节
      const chapters = this.splitIntoChapters(content);
      
      // 生成目录
      const toc = this.generateTableOfContents(chapters);

      return {
        bookId,
        chapters,
        toc,
        rawContent: content
      };
    } catch (error) {
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `TXT 内容解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 验证 TXT 文件格式
   */
  async validateTxtFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件扩展名
      if (!filePath.toLowerCase().endsWith('.txt')) {
        return false;
      }

      // 尝试读取文件前1KB来检查是否为有效的文本文件
      const buffer = Buffer.alloc(1024);
      const file = await fs.open(filePath, 'r');
      const { bytesRead } = await file.read(buffer, 0, 1024, 0);
      await file.close();
      
      // 检查是否包含过多的二进制字符
      const text = buffer.subarray(0, bytesRead);
      const binaryCount = text.filter(byte => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13).length;
      const binaryRatio = binaryCount / bytesRead;
      
      return binaryRatio < 0.1; // 如果二进制字符少于10%，认为是文本文件
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 检测文件编码并读取内容
   */
  private async readTextFileWithEncoding(filePath: string): Promise<string> {
    try {
      // 首先尝试 UTF-8 编码
      const content = await fs.readFile(filePath, 'utf-8');
      
      // 检查是否有乱码（简单检测）
      if (this.hasEncodingIssues(content)) {
        // 尝试其他编码
        return await this.tryAlternativeEncodings(filePath);
      }
      
      return content;
    } catch (error) {
      // 如果 UTF-8 失败，尝试其他编码
      return await this.tryAlternativeEncodings(filePath);
    }
  }

  /**
   * 尝试其他编码格式
   */
  private async tryAlternativeEncodings(filePath: string): Promise<string> {
    const encodings = ['gbk', 'gb2312', 'big5', 'latin1'];
    
    for (const encoding of encodings) {
      try {
        // 注意：Node.js 原生不支持这些编码，这里只是示例
        // 在实际实现中可能需要使用 iconv-lite 等库
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('utf-8');
        
        if (!this.hasEncodingIssues(content)) {
          return content;
        }
      } catch (error) {
        continue;
      }
    }
    
    // 如果所有编码都失败，返回原始 UTF-8 内容
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * 检查是否有编码问题
   */
  private hasEncodingIssues(content: string): boolean {
    // 简单的乱码检测：检查是否有过多的替换字符
    const replacementCharCount = (content.match(/�/g) || []).length;
    return replacementCharCount > content.length * 0.01; // 如果替换字符超过1%
  }

  /**
   * 从内容中提取作者信息
   */
  private extractAuthorFromContent(content: string): string | null {
    // 简单的启发式方法：查找常见的作者标识
    const authorPatterns = [
      /作者[：:]\s*([^\n\r]+)/,
      /著[：:]\s*([^\n\r]+)/,
      /Author[：:]\s*([^\n\r]+)/i,
      /By[：:]\s*([^\n\r]+)/i
    ];

    for (const pattern of authorPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 检测文本语言
   */
  private detectLanguage(content: string): string {
    // 简单的语言检测：基于字符特征
    const sample = content.substring(0, 1000); // 取前1000字符作为样本
    
    // 检测中文字符
    const chineseCharCount = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseRatio = chineseCharCount / sample.length;
    
    if (chineseRatio > 0.3) {
      return 'zh-CN';
    }
    
    // 检测日文字符
    const japaneseCharCount = (sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const japaneseRatio = japaneseCharCount / sample.length;
    
    if (japaneseRatio > 0.1) {
      return 'ja-JP';
    }
    
    // 默认为英文
    return 'en-US';
  }

  /**
   * 将文本分割为章节
   */
  private splitIntoChapters(content: string): Chapter[] {
    const chapters: Chapter[] = [];
    
    // 尝试基于章节标记分割（更严格的匹配，要求章节标记在行首或前面有换行符）
    const chapterMarkers = [
      /(?:^|\n\s*)第[一二三四五六七八九十\d]+章[^\n]*/gm,
      /(?:^|\n\s*)Chapter\s+\d+[^\n]*/gim,
      /(?:^|\n\s*)第[一二三四五六七八九十\d]+节[^\n]*/gm,
      /(?:^|\n\s*)Section\s+\d+[^\n]*/gim
    ];

    let chapterSplits: Array<{ index: number; title: string }> = [];
    
    // 查找章节标记
    for (const marker of chapterMarkers) {
      marker.lastIndex = 0; // 重置正则表达式的 lastIndex
      const matches = Array.from(content.matchAll(marker));
      if (matches.length > 1) { // 至少要有2个章节标记才认为是有效分割
        chapterSplits = matches.map(match => {
          const fullMatch = match[0];
          // 提取章节标题（去掉前面的换行符和空白）
          const title = fullMatch.replace(/^[\n\s]*/, '').trim();
          return {
            index: match.index! + (fullMatch.length - title.length),
            title
          };
        });
        break;
      }
    }

    if (chapterSplits.length > 0) {
      // 基于章节标记分割
      for (let i = 0; i < chapterSplits.length; i++) {
        const start = chapterSplits[i].index;
        const end = i < chapterSplits.length - 1 ? chapterSplits[i + 1].index : content.length;
        const chapterContent = content.substring(start, end).trim();
        
        if (chapterContent.length > 0) {
          const pageCount = Math.max(1, Math.ceil(chapterContent.length / this.charsPerPage));
          const startPage = chapters.reduce((sum, ch) => sum + ch.pageCount, 1);
          
          chapters.push({
            id: `txt-chapter-${i + 1}`,
            title: chapterSplits[i].title,
            content: chapterContent,
            pageCount,
            startPage
          });
        }
      }
    } else {
      // 如果没有找到章节标记，检查内容长度
      if (content.length <= this.charsPerChapter) {
        // 短内容作为单个章节
        chapters.push({
          id: 'txt-chapter-1',
          title: '全文',
          content,
          pageCount: Math.max(1, Math.ceil(content.length / this.charsPerPage)),
          startPage: 1
        });
      } else {
        // 长内容按字符数分割
        const chapterSize = this.charsPerChapter;
        let chapterNum = 1;
        
        for (let i = 0; i < content.length; i += chapterSize) {
          const chapterContent = content.substring(i, i + chapterSize).trim();
          
          if (chapterContent.length > 0) {
            const pageCount = Math.max(1, Math.ceil(chapterContent.length / this.charsPerPage));
            const startPage = chapters.reduce((sum, ch) => sum + ch.pageCount, 1);
            
            chapters.push({
              id: `txt-chapter-${chapterNum}`,
              title: `第 ${chapterNum} 章`,
              content: chapterContent,
              pageCount,
              startPage
            });
            
            chapterNum++;
          }
        }
      }
    }

    // 如果没有生成任何章节，将整个内容作为单个章节
    if (chapters.length === 0) {
      return [{
        id: 'txt-chapter-1',
        title: '全文',
        content,
        pageCount: Math.max(1, Math.ceil(content.length / this.charsPerPage)),
        startPage: 1
      }];
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