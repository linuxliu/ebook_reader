import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import { 
  BookMetadata, 
  BookContent, 
  VocabularyItem, 
  FileSystemService as IFileSystemService,
  ErrorType,
  AppError,
  BookFormat
} from '../../shared/types';
import { EpubParser } from './parsers/EpubParser';
import { PdfParser } from './parsers/PdfParser';
import { TxtParser } from './parsers/TxtParser';
import { MobiParser } from './parsers/MobiParser';

/**
 * 文件系统服务实现
 * 负责文件导入、验证、元信息提取和安全的文件路径处理
 */
export class FileSystemService implements IFileSystemService {
  private readonly supportedFormats: Set<string> = new Set([
    'application/epub+zip',
    'application/pdf',
    'application/x-mobipocket-ebook',
    'text/plain'
  ]);

  private readonly supportedExtensions: Set<string> = new Set([
    '.epub',
    '.pdf',
    '.mobi',
    '.txt'
  ]);

  private readonly maxFileSize = 500 * 1024 * 1024; // 500MB
  private readonly cacheDir: string;
  private readonly epubParser: EpubParser;
  private readonly pdfParser: PdfParser;
  private readonly txtParser: TxtParser;
  private readonly mobiParser: MobiParser;

  constructor(cacheDir?: string, private databaseService?: any) {
    this.cacheDir = cacheDir || path.join(process.cwd(), 'cache');
    this.epubParser = new EpubParser();
    this.pdfParser = new PdfParser();
    this.txtParser = new TxtParser();
    this.mobiParser = new MobiParser();
    this.ensureCacheDirectory();
  }

  /**
   * 导入书籍文件并提取基本元信息
   */
  async importBook(filePath: string): Promise<BookMetadata> {
    try {
      // 验证文件路径安全性（在文件访问之前）
      const safePath = this.sanitizePath(filePath);
      
      // 验证文件存在性和可读性
      await this.validateFileAccess(safePath);
      
      // 验证文件格式
      const isValid = await this.validateFile(safePath);
      if (!isValid) {
        throw this.createError(
          ErrorType.UNSUPPORTED_FORMAT,
          `不支持的文件格式: ${path.extname(safePath)}`
        );
      }

      // 获取文件信息
      const fileInfo = await this.getFileInfo(safePath);
      
      // 生成唯一的书籍ID
      const bookId = await this.generateBookId(safePath);
      
      // 提取基本元信息
      let metadata = await this.extractBasicMetadata(safePath, bookId, fileInfo);
      
      // 根据文件格式使用专门的解析器提取更详细的元信息
      if (fileInfo.format === 'epub') {
        try {
          const epubMetadata = await this.epubParser.parseMetadata(safePath, bookId);
          
          // 确保作者字段是字符串类型
          if (epubMetadata.author && typeof epubMetadata.author !== 'string') {
            if (epubMetadata.author._ && typeof epubMetadata.author._ === 'string') {
              epubMetadata.author = epubMetadata.author._;
            } else {
              epubMetadata.author = '未知作者';
            }
          }
          
          metadata = { ...metadata, ...epubMetadata };
        } catch (error) {
          // EPUB 解析失败时使用基本元信息，但记录警告
          console.warn('EPUB metadata parsing failed, using basic metadata:', error);
        }
      } else if (fileInfo.format === 'pdf') {
        try {
          const pdfMetadata = await this.pdfParser.parseMetadata(safePath, bookId);
          metadata = { ...metadata, ...pdfMetadata };
        } catch (error) {
          // PDF 解析失败时使用基本元信息，但记录警告
          console.warn('PDF metadata parsing failed, using basic metadata:', error);
        }
      } else if (fileInfo.format === 'txt') {
        try {
          const txtMetadata = await this.txtParser.parseMetadata(safePath, bookId);
          metadata = { ...metadata, ...txtMetadata };
        } catch (error) {
          // TXT 解析失败时使用基本元信息，但记录警告
          console.warn('TXT metadata parsing failed, using basic metadata:', error);
        }
      } else if (fileInfo.format === 'mobi') {
        try {
          const mobiMetadata = await this.mobiParser.parseMetadata(safePath, bookId);
          metadata = { ...metadata, ...mobiMetadata };
        } catch (error) {
          // MOBI 解析失败时使用基本元信息，但记录警告
          console.warn('MOBI metadata parsing failed, using basic metadata:', error);
        }
      }
      
      return metadata;
    } catch (error) {
      // 如果是我们自定义的错误，直接抛出
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      throw this.createError(
        ErrorType.FILE_NOT_FOUND,
        `导入书籍失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 解析书籍内容
   */
  async parseBookContent(bookId: string): Promise<BookContent> {
    try {
      // 首先需要找到书籍文件路径
      const bookMetadata = await this.getBookMetadataById(bookId);
      if (!bookMetadata) {
        throw this.createError(
          ErrorType.FILE_NOT_FOUND,
          `找不到书籍 ID: ${bookId}`
        );
      }

      const filePath = bookMetadata.filePath;
      const format = bookMetadata.format;

      let content: BookContent;

      // 根据格式选择相应的解析器
      switch (format) {
        case 'epub':
          content = await this.epubParser.parseContent(filePath, bookId);
          break;
        
        case 'pdf':
          content = await this.pdfParser.parseContent(filePath, bookId);
          break;
        
        case 'mobi':
          content = await this.mobiParser.parseContent(filePath, bookId);
          break;
        
        case 'txt':
          content = await this.txtParser.parseContent(filePath, bookId);
          break;
        
        default:
          throw this.createError(
            ErrorType.UNSUPPORTED_FORMAT,
            `不支持的文件格式: ${format}`
          );
      }

      // 计算真实的总页数并更新数据库
      const totalPages = this.calculateTotalPages(content.chapters);
      if (totalPages !== bookMetadata.totalPages && this.databaseService) {
        try {
          await this.databaseService.updateBook(bookId, { totalPages });
          console.log(`Updated book ${bookId} total pages: ${bookMetadata.totalPages} -> ${totalPages}`);
        } catch (error) {
          console.warn('Failed to update book total pages:', error);
        }
      }

      return content;
    } catch (error) {
      // 如果是我们自定义的错误，直接抛出
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      throw this.createError(
        ErrorType.PARSE_ERROR,
        `解析书籍内容失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 计算书籍的真实总页数
   */
  private calculateTotalPages(chapters: any[]): number {
    if (!chapters || chapters.length === 0) {
      return 1;
    }
    
    const lastChapter = chapters[chapters.length - 1];
    return lastChapter.startPage + lastChapter.pageCount - 1;
  }

  /**
   * 导出生词表
   */
  async exportVocabulary(format: 'csv' | 'txt', vocabulary: VocabularyItem[]): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `vocabulary_${timestamp}.${format}`;
      const exportPath = path.join(this.cacheDir, 'exports', fileName);
      
      // 确保导出目录存在
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      
      let content: string;
      
      if (format === 'csv') {
        content = this.generateCSVContent(vocabulary);
      } else {
        content = this.generateTXTContent(vocabulary);
      }
      
      await fs.writeFile(exportPath, content, 'utf-8');
      return exportPath;
    } catch (error) {
      throw this.createError(
        ErrorType.CACHE_ERROR,
        `导出生词表失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 清理缓存
   */
  async clearCache(bookId?: string): Promise<void> {
    try {
      if (bookId) {
        // 清理特定书籍的缓存
        const bookCacheDir = path.join(this.cacheDir, bookId);
        await this.removeDirectory(bookCacheDir);
      } else {
        // 清理所有缓存
        await this.removeDirectory(this.cacheDir);
        await this.ensureCacheDirectory();
      }
    } catch (error) {
      throw this.createError(
        ErrorType.CACHE_ERROR,
        `清理缓存失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 验证文件格式和完整性
   */
  async validateFile(filePath: string): Promise<boolean> {
    try {
      // 验证文件路径安全性（在文件访问之前）
      const safePath = this.sanitizePath(filePath);
      
      // 检查文件扩展名
      const ext = path.extname(safePath).toLowerCase();
      if (!this.supportedExtensions.has(ext)) {
        return false;
      }
      
      // 检查文件大小
      const stats = await fs.stat(safePath);
      if (stats.size > this.maxFileSize) {
        throw this.createError(
          ErrorType.STORAGE_FULL,
          `文件过大，最大支持 ${this.maxFileSize / 1024 / 1024}MB`
        );
      }
      
      // 检查MIME类型（基于扩展名）
      const mimeType = mime.lookup(ext);
      if (mimeType && this.supportedFormats.has(mimeType)) {
        return true;
      }
      
      // 对于不同格式进行专门验证
      switch (ext) {
        case '.txt':
          return await this.txtParser.validateTxtFile(safePath);
        case '.epub':
          return await this.epubParser.validateEpubFile(safePath);
        case '.pdf':
          return await this.pdfParser.validatePdfFile(safePath);
        case '.mobi':
          return await this.mobiParser.validateMobiFile(safePath);
        default:
          return false;
      }
    } catch (error) {
      // 如果是我们自定义的错误，直接抛出
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{ size: number; format: string }> {
    try {
      // 验证文件路径安全性（在文件访问之前）
      const safePath = this.sanitizePath(filePath);
      const stats = await fs.stat(safePath);
      const ext = path.extname(safePath).toLowerCase();
      
      let format: string;
      switch (ext) {
        case '.epub':
          format = 'epub';
          break;
        case '.pdf':
          format = 'pdf';
          break;
        case '.mobi':
          format = 'mobi';
          break;
        case '.txt':
          format = 'txt';
          break;
        default:
          format = 'unknown';
      }
      
      return {
        size: stats.size,
        format
      };
    } catch (error) {
      throw this.createError(
        ErrorType.FILE_NOT_FOUND,
        `获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 安全的文件路径处理，防止路径遍历攻击
   */
  private sanitizePath(filePath: string): string {
    // 检查路径是否包含危险字符
    if (filePath.includes('..') || filePath.includes('~') || filePath.startsWith('/etc/') || filePath.includes('\\..\\')) {
      throw this.createError(
        ErrorType.PERMISSION_ERROR,
        '不安全的文件路径'
      );
    }
    
    // 解析路径并规范化
    const resolved = path.resolve(filePath);
    
    return resolved;
  }

  /**
   * 验证文件访问权限
   */
  private async validateFileAccess(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    } catch (error) {
      throw this.createError(
        ErrorType.FILE_NOT_FOUND,
        `文件不存在或无法访问: ${filePath}`
      );
    }
  }



  /**
   * 生成书籍唯一ID
   */
  private async generateBookId(filePath: string): Promise<string> {
    const stats = await fs.stat(filePath);
    const content = `${filePath}${stats.size}${stats.mtime.getTime()}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 提取基本元信息
   */
  private async extractBasicMetadata(
    filePath: string, 
    bookId: string, 
    fileInfo: { size: number; format: string }
  ): Promise<BookMetadata> {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    const metadata: BookMetadata = {
      id: bookId,
      title: fileName, // 后续会被具体解析器覆盖
      author: '未知作者', // 后续会被具体解析器覆盖
      cover: undefined, // 明确设置为 undefined
      format: fileInfo.format as BookFormat,
      filePath,
      fileSize: fileInfo.size,
      importDate: new Date(),
      lastReadDate: undefined, // 明确设置为 undefined
      totalPages: 0, // 后续会被具体解析器设置
      language: 'zh-CN' // 默认语言，后续可能会被检测覆盖
    };
    
    return metadata;
  }

  /**
   * 生成CSV格式的生词表内容
   */
  private generateCSVContent(vocabulary: VocabularyItem[]): string {
    const headers = ['单词', '翻译', '发音', '例句', '书籍', '上下文', '添加时间', '已掌握'];
    const rows = vocabulary.map(item => [
      this.escapeCsvField(item.word),
      this.escapeCsvField(item.translation),
      this.escapeCsvField(item.pronunciation || ''),
      this.escapeCsvField(item.example || ''),
      this.escapeCsvField(item.bookId),
      this.escapeCsvField(item.context),
      item.addedDate.toISOString(),
      item.mastered ? '是' : '否'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * 生成TXT格式的生词表内容
   */
  private generateTXTContent(vocabulary: VocabularyItem[]): string {
    return vocabulary.map(item => {
      const lines = [
        `单词: ${item.word}`,
        `翻译: ${item.translation}`,
      ];
      
      if (item.pronunciation) {
        lines.push(`发音: ${item.pronunciation}`);
      }
      
      if (item.example) {
        lines.push(`例句: ${item.example}`);
      }
      
      lines.push(
        `上下文: ${item.context}`,
        `添加时间: ${item.addedDate.toLocaleString()}`,
        `已掌握: ${item.mastered ? '是' : '否'}`,
        '---'
      );
      
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * 转义CSV字段
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      throw this.createError(
        ErrorType.CACHE_ERROR,
        `创建缓存目录失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 递归删除目录
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // 忽略目录不存在的错误
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 根据书籍 ID 获取书籍元信息
   */
  private async getBookMetadataById(bookId: string): Promise<BookMetadata | null> {
    if (this.databaseService) {
      try {
        return await this.databaseService.getBook(bookId);
      } catch (error) {
        console.error('Failed to get book metadata from database:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * 创建空的书籍内容结构
   */
  private createEmptyBookContent(bookId: string): BookContent {
    return {
      bookId,
      chapters: [],
      toc: [],
      rawContent: ''
    };
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
      recoverable: type !== ErrorType.PERMISSION_ERROR
    };
  }
}