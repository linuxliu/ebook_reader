import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { 
  CacheService as ICacheService, 
  CachedBook, 
  BookContent, 
  BookMetadata,
  ErrorType,
  AppError 
} from '../../shared/types';

/**
 * 缓存管理服务
 * 负责电子书内容的缓存生成、读取、版本管理和清理
 */
export class CacheService implements ICacheService {
  private readonly cacheDir: string;
  private readonly currentVersion = '1.0.0';
  private readonly maxCacheSize = 1024 * 1024 * 1024; // 1GB
  private readonly cacheExtension = '.cache.json';
  private readonly memoryCache = new Map<string, CachedBook>();

  constructor(cacheDir?: string) {
    // 使用用户指定的缓存目录或默认的应用缓存目录
    this.cacheDir = cacheDir || path.join(os.homedir(), '.electron-ebook-reader', 'cache');
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(bookId: string): string {
    return path.join(this.cacheDir, `${bookId}${this.cacheExtension}`);
  }

  /**
   * 生成书籍缓存
   */
  async generateCache(bookId: string, content: BookContent): Promise<void> {
    try {
      await this.ensureCacheDirectory();

      const cachedBook: CachedBook = {
        bookId,
        chapters: content.chapters,
        toc: content.toc,
        metadata: content.bookId as any, // This will be properly set by the caller
        cacheVersion: this.currentVersion,
        createdAt: new Date()
      };

      const cacheFilePath = this.getCacheFilePath(bookId);
      const cacheData = JSON.stringify(cachedBook, null, 2);
      
      await fs.writeFile(cacheFilePath, cacheData, 'utf-8');
      
      // 检查缓存大小限制
      await this.checkCacheSizeLimit();
      
    } catch (error) {
      throw this.createCacheError('Failed to generate cache', error);
    }
  }

  /**
   * 检查缓存是否存在
   */
  async hasCache(bookId: string): Promise<boolean> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(bookId)) {
        return true;
      }
      
      const cacheFilePath = this.getCacheFilePath(bookId);
      await fs.access(cacheFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 预加载缓存到内存中以便快速访问
   */
  async preloadCache(bookId: string): Promise<void> {
    try {
      // Skip if already in memory
      if (this.memoryCache.has(bookId)) {
        return;
      }
      
      const cached = await this.getCache(bookId);
      if (cached) {
        this.memoryCache.set(bookId, cached);
        console.log(`Preloaded cache for book: ${bookId}`);
      }
    } catch (error) {
      console.warn(`Failed to preload cache for book ${bookId}:`, error);
    }
  }

  /**
   * 获取书籍缓存
   */
  async getCache(bookId: string): Promise<CachedBook | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(bookId)) {
        return this.memoryCache.get(bookId)!;
      }
      
      const cacheFilePath = this.getCacheFilePath(bookId);
      
      // 检查文件是否存在
      try {
        await fs.access(cacheFilePath);
      } catch {
        return null;
      }

      const cacheData = await fs.readFile(cacheFilePath, 'utf-8');
      const cachedBook: CachedBook = JSON.parse(cacheData);
      
      // Convert createdAt string back to Date object
      if (typeof cachedBook.createdAt === 'string') {
        cachedBook.createdAt = new Date(cachedBook.createdAt);
      }

      // 验证缓存版本
      if (!await this.isCacheValid(bookId)) {
        await this.invalidateCache(bookId);
        return null;
      }

      // Store in memory cache for future access
      this.memoryCache.set(bookId, cachedBook);

      return cachedBook;
      
    } catch (error) {
      // 如果缓存文件损坏，删除它
      try {
        await this.invalidateCache(bookId);
      } catch {
        // 忽略删除错误
      }
      
      throw this.createCacheError('Failed to read cache', error);
    }
  }

  /**
   * 使缓存失效（删除缓存文件）
   */
  async invalidateCache(bookId: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(bookId);
      
      const cacheFilePath = this.getCacheFilePath(bookId);
      
      try {
        await fs.unlink(cacheFilePath);
      } catch (error: any) {
        // 如果文件不存在，忽略错误
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      
    } catch (error) {
      throw this.createCacheError('Failed to invalidate cache', error);
    }
  }

  /**
   * 获取缓存总大小（字节）
   */
  async getCacheSize(): Promise<number> {
    try {
      await this.ensureCacheDirectory();
      
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith(this.cacheExtension)) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
          } catch {
            // 忽略无法访问的文件
          }
        }
      }

      return totalSize;
      
    } catch (error) {
      throw this.createCacheError('Failed to calculate cache size', error);
    }
  }

  /**
   * 清理缓存
   * 删除所有缓存文件或根据 LRU 策略删除旧文件
   */
  async cleanupCache(): Promise<void> {
    try {
      await this.ensureCacheDirectory();
      
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith(this.cacheExtension));

      // 获取文件信息并按最后访问时间排序
      const fileInfos = await Promise.all(
        cacheFiles.map(async (file) => {
          const filePath = path.join(this.cacheDir, file);
          try {
            const stats = await fs.stat(filePath);
            return {
              path: filePath,
              name: file,
              size: stats.size,
              atime: stats.atime,
              mtime: stats.mtime
            };
          } catch {
            return null;
          }
        })
      );

      const validFiles = fileInfos.filter(info => info !== null);
      
      // 按最后访问时间排序（最旧的在前）
      validFiles.sort((a, b) => a!.atime.getTime() - b!.atime.getTime());

      const currentSize = await this.getCacheSize();
      
      // 如果超过最大缓存大小，删除最旧的文件
      if (currentSize > this.maxCacheSize) {
        let sizeToRemove = currentSize - this.maxCacheSize * 0.8; // 清理到80%
        
        for (const fileInfo of validFiles) {
          if (sizeToRemove <= 0) break;
          
          try {
            await fs.unlink(fileInfo!.path);
            sizeToRemove -= fileInfo!.size;
          } catch {
            // 忽略删除错误
          }
        }
      }
      
    } catch (error) {
      throw this.createCacheError('Failed to cleanup cache', error);
    }
  }

  /**
   * 检查缓存是否有效
   */
  async isCacheValid(bookId: string): Promise<boolean> {
    try {
      const cacheFilePath = this.getCacheFilePath(bookId);
      
      // 检查文件是否存在
      try {
        await fs.access(cacheFilePath);
      } catch {
        return false;
      }

      const cacheData = await fs.readFile(cacheFilePath, 'utf-8');
      const cachedBook: CachedBook = JSON.parse(cacheData);
      
      // Convert createdAt string back to Date object if needed
      if (typeof cachedBook.createdAt === 'string') {
        cachedBook.createdAt = new Date(cachedBook.createdAt);
      }

      // 检查版本是否匹配
      if (cachedBook.cacheVersion !== this.currentVersion) {
        return false;
      }

      // 检查缓存是否过期（可选：设置缓存过期时间）
      // const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
      // if (Date.now() - cachedBook.createdAt.getTime() > maxAge) {
      //   return false;
      // }

      return true;
      
    } catch {
      return false;
    }
  }

  /**
   * 更新缓存版本
   */
  async updateCacheVersion(bookId: string, version: string): Promise<void> {
    try {
      const cachedBook = await this.getCache(bookId);
      if (!cachedBook) {
        throw new Error('Cache not found');
      }

      cachedBook.cacheVersion = version;
      
      // Ensure createdAt is a Date object
      if (typeof cachedBook.createdAt === 'string') {
        cachedBook.createdAt = new Date(cachedBook.createdAt);
      }
      
      const cacheFilePath = this.getCacheFilePath(bookId);
      const cacheData = JSON.stringify(cachedBook, null, 2);
      
      await fs.writeFile(cacheFilePath, cacheData, 'utf-8');
      
    } catch (error) {
      throw this.createCacheError('Failed to update cache version', error);
    }
  }

  /**
   * 检查缓存大小限制
   */
  private async checkCacheSizeLimit(): Promise<void> {
    const currentSize = await this.getCacheSize();
    
    if (currentSize > this.maxCacheSize) {
      await this.cleanupCache();
    }
  }

  /**
   * 创建缓存错误
   */
  private createCacheError(message: string, originalError?: unknown): AppError {
    return {
      type: ErrorType.CACHE_ERROR,
      message,
      details: originalError,
      timestamp: new Date(),
      recoverable: true
    };
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    fileCount: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    try {
      await this.ensureCacheDirectory();
      
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith(this.cacheExtension));

      if (cacheFiles.length === 0) {
        return {
          totalSize: 0,
          fileCount: 0,
          oldestFile: null,
          newestFile: null
        };
      }

      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;

      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          
          const mtime = stats.mtime.getTime();
          if (mtime < oldestTime) oldestTime = mtime;
          if (mtime > newestTime) newestTime = mtime;
        } catch {
          // 忽略无法访问的文件
        }
      }

      return {
        totalSize,
        fileCount: cacheFiles.length,
        oldestFile: new Date(oldestTime),
        newestFile: new Date(newestTime)
      };
      
    } catch (error) {
      throw this.createCacheError('Failed to get cache stats', error);
    }
  }

  /**
   * 清理所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.ensureCacheDirectory();
      
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith(this.cacheExtension));

      await Promise.all(
        cacheFiles.map(async (file) => {
          const filePath = path.join(this.cacheDir, file);
          try {
            await fs.unlink(filePath);
          } catch {
            // 忽略删除错误
          }
        })
      );
      
    } catch (error) {
      throw this.createCacheError('Failed to clear all cache', error);
    }
  }
}