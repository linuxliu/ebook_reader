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
 * 实现真实的 MOBI 文件解析功能，支持 PalmDOC 压缩和 EXTH 头解析
 */
export class MobiParser {
  /**
   * 解析 MOBI 文件并提取元信息
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    try {
      const buffer = await fs.readFile(filePath);
      
      // 验证 MOBI 文件格式
      if (!this.validateMobiFormat(buffer)) {
        throw new Error('Invalid MOBI file format');
      }
      
      // 解析 PalmDOC 头
      const palmDocHeader = this.parsePalmDocHeader(buffer);
      
      // 解析 MOBI 头
      const mobiHeader = this.parseMobiHeader(buffer, palmDocHeader);
      
      // 解析 EXTH 头（扩展元数据）
      const exthData = this.parseExthHeader(buffer, mobiHeader);
      
      // 提取元信息
      const title = exthData.title || mobiHeader.fullName || path.basename(filePath, '.mobi');
      const author = exthData.author || '未知作者';
      const language = this.mapLanguageCode(mobiHeader.language) || 'zh-CN';
      
      // 计算页数（基于文本记录数）
      const totalPages = Math.max(1, palmDocHeader.recordCount * 5); // 估算每个记录5页

      return {
        title,
        author,
        language,
        totalPages
      };
    } catch (error) {
      // 如果解析失败，返回基本元数据
      console.warn('MOBI metadata parsing failed, using basic metadata:', error);
      return {
        title: path.basename(filePath, '.mobi'),
        author: '未知作者',
        language: 'zh-CN',
        totalPages: 100
      };
    }
  }

  /**
   * 解析 MOBI 内容
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    try {
      const buffer = await fs.readFile(filePath);
      
      // 验证 MOBI 文件格式
      if (!this.validateMobiFormat(buffer)) {
        throw new Error('Invalid MOBI file format');
      }
      
      // 解析文本内容
      const textContent = await this.extractTextContent(buffer);
      
      // 生成章节结构
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
      // 对于 MOBI 解析失败，返回一个基本的结构
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

      const buffer = await fs.readFile(filePath);
      return this.validateMobiFormat(buffer);
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 验证 MOBI 文件格式
   */
  private validateMobiFormat(buffer: Buffer): boolean {
    if (buffer.length < 78) {
      return false;
    }
    
    // 检查 PDB 头的类型和创建者
    const type = buffer.toString('ascii', 60, 64);
    const creator = buffer.toString('ascii', 64, 68);
    
    return type === 'BOOK' && creator === 'MOBI';
  }

  /**
   * 解析 PalmDOC 头
   */
  private parsePalmDocHeader(buffer: Buffer): {
    compression: number;
    textLength: number;
    recordCount: number;
    recordSize: number;
  } {
    // PDB 头后面是记录列表，然后是 PalmDOC 头
    const recordCount = buffer.readUInt16BE(76);
    const firstRecordOffset = buffer.readUInt32BE(78);
    
    // PalmDOC 头在第一个记录的开始
    const compression = buffer.readUInt16BE(firstRecordOffset);
    const textLength = buffer.readUInt32BE(firstRecordOffset + 4);
    const recordSize = buffer.readUInt16BE(firstRecordOffset + 10);
    
    return {
      compression,
      textLength,
      recordCount: recordCount - 1, // 减去记录0（PalmDOC头）
      recordSize
    };
  }

  /**
   * 解析 MOBI 头
   */
  private parseMobiHeader(buffer: Buffer, palmDocHeader: any): {
    identifier: string;
    headerLength: number;
    mobiType: number;
    textEncoding: number;
    language: number;
    fullName?: string;
    exthFlag: number;
  } {
    const firstRecordOffset = buffer.readUInt32BE(78);
    
    // MOBI 头在 PalmDOC 头之后
    const mobiHeaderOffset = firstRecordOffset + 16;
    
    if (mobiHeaderOffset + 4 > buffer.length) {
      throw new Error('Invalid MOBI header offset');
    }
    
    const identifier = buffer.toString('ascii', mobiHeaderOffset, mobiHeaderOffset + 4);
    if (identifier !== 'MOBI') {
      throw new Error('Invalid MOBI header identifier');
    }
    
    const headerLength = buffer.readUInt32BE(mobiHeaderOffset + 4);
    const mobiType = buffer.readUInt32BE(mobiHeaderOffset + 8);
    const textEncoding = buffer.readUInt32BE(mobiHeaderOffset + 12);
    
    // 安全地读取语言和其他字段
    let language = 9; // 默认英语
    let exthFlag = 0;
    let fullName: string | undefined;
    
    if (mobiHeaderOffset + 88 <= buffer.length) {
      language = buffer.readUInt32BE(mobiHeaderOffset + 84);
    }
    
    if (mobiHeaderOffset + 132 <= buffer.length) {
      exthFlag = buffer.readUInt32BE(mobiHeaderOffset + 128);
    }
    
    // 尝试读取全名
    if (headerLength >= 232 && mobiHeaderOffset + 92 <= buffer.length) {
      try {
        const fullNameOffset = buffer.readUInt32BE(mobiHeaderOffset + 84);
        const fullNameLength = buffer.readUInt32BE(mobiHeaderOffset + 88);
        if (fullNameOffset > 0 && fullNameLength > 0 && 
            firstRecordOffset + fullNameOffset + fullNameLength <= buffer.length) {
          fullName = buffer.toString('utf-8', firstRecordOffset + fullNameOffset, 
                                    firstRecordOffset + fullNameOffset + fullNameLength);
        }
      } catch (error) {
        // 忽略全名读取错误
      }
    }
    
    return {
      identifier,
      headerLength,
      mobiType,
      textEncoding,
      language,
      fullName,
      exthFlag
    };
  }

  /**
   * 解析 EXTH 头（扩展元数据）
   */
  private parseExthHeader(buffer: Buffer, mobiHeader: any): {
    title?: string;
    author?: string;
    publisher?: string;
    description?: string;
  } {
    if (!(mobiHeader.exthFlag & 0x40)) {
      return {}; // 没有 EXTH 头
    }
    
    const firstRecordOffset = buffer.readUInt32BE(78);
    const exthOffset = firstRecordOffset + 16 + mobiHeader.headerLength;
    
    if (exthOffset + 12 > buffer.length) {
      return {};
    }
    
    const exthIdentifier = buffer.toString('ascii', exthOffset, exthOffset + 4);
    if (exthIdentifier !== 'EXTH') {
      return {};
    }
    
    const exthHeaderLength = buffer.readUInt32BE(exthOffset + 4);
    const exthRecordCount = buffer.readUInt32BE(exthOffset + 8);
    
    const metadata: any = {};
    let offset = exthOffset + 12;
    
    try {
      for (let i = 0; i < exthRecordCount && offset + 8 <= buffer.length; i++) {
        const recordType = buffer.readUInt32BE(offset);
        const recordLength = buffer.readUInt32BE(offset + 4);
        
        if (offset + recordLength > buffer.length) {
          break;
        }
        
        const recordData = buffer.toString('utf-8', offset + 8, offset + recordLength);
        
        switch (recordType) {
          case 100: // 作者
            metadata.author = recordData;
            break;
          case 101: // 出版商
            metadata.publisher = recordData;
            break;
          case 103: // 描述
            metadata.description = recordData;
            break;
          case 503: // 标题
            metadata.title = recordData;
            break;
        }
        
        offset += recordLength;
      }
    } catch (error) {
      // 忽略 EXTH 解析错误
    }
    
    return metadata;
  }

  /**
   * 映射语言代码
   */
  private mapLanguageCode(languageCode: number): string {
    const languageMap: { [key: number]: string } = {
      1: 'en', // 英语
      4: 'zh-CN', // 中文简体
      9: 'en', // 英语
      25: 'zh-TW', // 中文繁体
      33: 'fr', // 法语
      34: 'de', // 德语
      35: 'it', // 意大利语
      36: 'ja', // 日语
      37: 'ko', // 韩语
      38: 'es', // 西班牙语
    };
    
    return languageMap[languageCode] || 'en';
  }

  /**
   * 提取文本内容
   */
  private async extractTextContent(buffer: Buffer): Promise<string> {
    try {
      // 解析 PalmDOC 头获取压缩信息
      const palmDocHeader = this.parsePalmDocHeader(buffer);
      
      // 获取文本记录
      const textRecords = this.extractTextRecords(buffer, palmDocHeader);
      
      // 解压缩文本
      let fullText = '';
      for (const record of textRecords) {
        const decompressedText = this.decompressPalmDOC(record, palmDocHeader.compression);
        fullText += decompressedText;
      }
      
      // 清理文本
      return this.cleanMobiText(fullText);
    } catch (error) {
      return `MOBI 文件内容提取失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 提取文本记录
   */
  private extractTextRecords(buffer: Buffer, palmDocHeader: any): Buffer[] {
    const records: Buffer[] = [];
    const recordCount = buffer.readUInt16BE(76);
    
    // 读取记录偏移表
    for (let i = 1; i < recordCount && i <= palmDocHeader.recordCount + 1; i++) {
      const recordOffset = buffer.readUInt32BE(78 + (i * 8));
      const nextRecordOffset = i < recordCount - 1 ? 
        buffer.readUInt32BE(78 + ((i + 1) * 8)) : buffer.length;
      
      if (recordOffset < buffer.length && nextRecordOffset <= buffer.length) {
        const recordData = buffer.subarray(recordOffset, nextRecordOffset);
        records.push(recordData);
      }
    }
    
    return records;
  }

  /**
   * 解压缩 PalmDOC 格式的文本
   */
  private decompressPalmDOC(data: Buffer, compression: number): string {
    if (compression === 1) {
      // 无压缩
      return data.toString('utf-8');
    } else if (compression === 2) {
      // PalmDOC 压缩
      return this.decompressPalmDOCCompression(data);
    } else {
      // 不支持的压缩格式
      return data.toString('utf-8');
    }
  }

  /**
   * PalmDOC 压缩解压算法
   */
  private decompressPalmDOCCompression(data: Buffer): string {
    const result: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      const byte = data[i];
      
      if (byte === 0) {
        result.push(0);
        i++;
      } else if (byte >= 1 && byte <= 8) {
        // 字面字符
        for (let j = 0; j < byte && i + 1 + j < data.length; j++) {
          result.push(data[i + 1 + j]);
        }
        i += byte + 1;
      } else if (byte >= 0x80 && byte <= 0xBF) {
        // 距离/长度对
        if (i + 1 < data.length) {
          const nextByte = data[i + 1];
          const distance = ((byte & 0x3F) << 3) | (nextByte >> 5);
          const length = (nextByte & 0x1F) + 3;
          
          // 复制之前的字符
          for (let j = 0; j < length; j++) {
            const pos = result.length - distance;
            if (pos >= 0) {
              result.push(result[pos]);
            }
          }
          i += 2;
        } else {
          result.push(byte);
          i++;
        }
      } else if (byte >= 0xC0) {
        // 空格 + 字符
        result.push(0x20); // 空格
        result.push(byte ^ 0x80);
        i++;
      } else {
        // 普通字符
        result.push(byte);
        i++;
      }
    }
    
    return Buffer.from(result).toString('utf-8');
  }

  /**
   * 清理 MOBI 文本
   */
  private cleanMobiText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '') // 移除 HTML 标签
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
      .replace(/\s+/g, ' ') // 规范化空白字符
      .replace(/\n\s*\n/g, '\n\n') // 保留段落分隔但规范化
      .trim();
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
    let currentStartPage = 1;
    
    for (let i = 0; i < text.length; i += chapterSize) {
      const chapterContent = text.substring(i, i + chapterSize).trim();
      
      if (chapterContent.length > 0) {
        const pageCount = Math.max(1, Math.ceil(chapterContent.length / 2000));
        
        chapters.push({
          id: `mobi-chapter-${chapterNum}`,
          title: `第 ${chapterNum} 部分`,
          content: chapterContent,
          pageCount,
          startPage: currentStartPage
        });
        
        currentStartPage += pageCount;
        chapterNum++;
      }
    }
    
    return chapters;
  }

  /**
   * 生成目录
   */
  private generateTableOfContents(chapters: Chapter[]): TableOfContent[] {
    return chapters.map((chapter) => ({
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