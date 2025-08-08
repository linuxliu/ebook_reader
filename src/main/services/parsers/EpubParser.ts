import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkerManager, WorkerResult } from '../WorkerManager';
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
 * 使用 Worker 线程进行并行处理以提高性能
 */
export class EpubParser {
  private workerManager: WorkerManager;

  constructor() {
    this.workerManager = WorkerManager.getInstance();
  }

  /**
   * 解析 EPUB 文件并提取元信息（使用 Worker）
   */
  async parseMetadata(filePath: string, bookId: string): Promise<Partial<BookMetadata>> {
    console.log(`Starting EPUB metadata parsing in worker for: ${filePath}`);
    
    try {
      const result: WorkerResult<Partial<BookMetadata>> = await this.workerManager.executeEpubTask(
        'parseMetadata',
        filePath,
        bookId,
        25000 // 25秒超时
      );

      if (result.success && result.data) {
        console.log('EPUB metadata parsing completed successfully in worker');
        return result.data;
      } else {
        // 使用 fallback 数据
        const errorMessage = result.error?.message || '未知错误';
        console.warn('EPUB metadata parsing failed in worker, using fallback:', errorMessage);
        
        return result.fallbackData || {
          title: path.basename(filePath, '.epub'),
          author: '未知作者',
          language: 'zh-CN',
          totalPages: 100
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.warn('Worker execution failed, using basic metadata:', errorMessage);
      
      // 返回基本的元数据
      return {
        title: path.basename(filePath, '.epub'),
        author: '未知作者',
        language: 'zh-CN',
        totalPages: 100
      };
    }
  }

  /**
   * 解析 EPUB 内容，包括章节和目录（使用 Worker）
   */
  async parseContent(filePath: string, bookId: string): Promise<BookContent> {
    console.log(`Starting EPUB content parsing in worker for: ${filePath}`);
    
    try {
      const result: WorkerResult<BookContent> = await this.workerManager.executeEpubTask(
        'parseContent',
        filePath,
        bookId,
        45000 // 45秒超时，内容解析需要更多时间
      );

      if (result.success && result.data) {
        console.log('EPUB content parsing completed successfully in worker');
        return result.data;
      } else {
        // 使用 fallback 数据
        const errorMessage = result.error?.message || '未知错误';
        console.warn('EPUB content parsing failed in worker, using fallback:', errorMessage);
        
        return result.fallbackData || {
          bookId,
          chapters: [{
            id: 'chapter-1',
            title: 'Chapter 1',
            content: '内容解析失败，请尝试使用其他阅读器打开此文件。',
            pageCount: 1,
            startPage: 1
          }],
          toc: [{
            id: 'toc-1',
            title: 'Chapter 1',
            level: 0,
            page: 1
          }],
          rawContent: '内容解析失败，请尝试使用其他阅读器打开此文件。'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.warn('Worker execution failed, returning minimal content:', errorMessage);
      
      // 返回最小的内容结构
      return {
        bookId,
        chapters: [{
          id: 'chapter-1',
          title: 'Chapter 1',
          content: '内容解析失败，请尝试使用其他阅读器打开此文件。',
          pageCount: 1,
          startPage: 1
        }],
        toc: [{
          id: 'toc-1',
          title: 'Chapter 1',
          level: 0,
          page: 1
        }],
        rawContent: '内容解析失败，请尝试使用其他阅读器打开此文件。'
      };
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

      // 简单的文件存在性检查
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // Worker 管理器会处理清理
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