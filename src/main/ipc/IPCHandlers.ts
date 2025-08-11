import { ipcMain, dialog } from 'electron';
import { 
  IPCChannel, 
  IPCRequest, 
  IPCResponse, 
  BookImportRequest,
  BookImportResponse,
  BookContentRequest,
  BookContentResponse,
  ProgressSaveRequest,
  VocabularyAddRequest,
  VocabularyExportRequest,
  VocabularyExportResponse,
  TranslationRequest,
  SettingsSaveRequest,
  AppSettingsSaveRequest,
  CacheGenerateRequest,
  AppError,
  ErrorType
} from '../../shared/types';
import { DatabaseService } from '../services/DatabaseService';
import { FileSystemService } from '../services/FileSystemService';
import { CacheService } from '../services/CacheService';
import { TranslationServiceImpl } from '../services/TranslationService';
import { autoUpdaterService } from '../services/AutoUpdaterService';

/**
 * IPC 处理器类
 * 负责处理渲染进程发送的所有 IPC 请求
 */
export class IPCHandlers {
  private databaseService: DatabaseService;
  private fileSystemService: FileSystemService;
  private cacheService: CacheService;
  private translationService: TranslationServiceImpl;
  private requestTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly defaultTimeout = 60000; // 60秒超时，给书籍导入更多时间

  constructor(databaseService?: DatabaseService, cacheService?: CacheService) {
    this.databaseService = databaseService || new DatabaseService();
    this.fileSystemService = new FileSystemService();
    this.cacheService = cacheService || new CacheService();
    this.translationService = new TranslationServiceImpl();
  }

  /**
   * 初始化所有 IPC 处理器
   */
  async initialize(): Promise<void> {
    try {
      // 注册所有 IPC 处理器
      this.registerBookHandlers();
      this.registerProgressHandlers();
      this.registerVocabularyHandlers();
      this.registerSettingsHandlers();
      this.registerCacheHandlers();
      this.registerTranslationHandlers();
      this.registerFileSystemHandlers();
      this.registerAppHandlers();
      this.registerUpdaterHandlers();
      
      console.log('IPC handlers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IPC handlers:', error);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 清理所有超时定时器
      this.requestTimeouts.forEach(timeout => clearTimeout(timeout));
      this.requestTimeouts.clear();
      
      // 关闭数据库连接
      await this.databaseService.close();
      
      console.log('IPC handlers cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup IPC handlers:', error);
    }
  }

  // ============================================================================
  // 书籍管理相关处理器
  // ============================================================================

  private registerBookHandlers(): void {
    // 导入书籍
    ipcMain.handle('book:import', async (event, request: IPCRequest<BookImportRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { filePath } = request.data!;
        
        // 如果没有提供文件路径，打开文件选择对话框
        let targetPath = filePath;
        if (!targetPath) {
          const result = await dialog.showOpenDialog({
            title: '选择电子书文件',
            filters: [
              { name: '电子书文件', extensions: ['epub', 'pdf', 'mobi', 'txt'] },
              { name: 'EPUB 文件', extensions: ['epub'] },
              { name: 'PDF 文件', extensions: ['pdf'] },
              { name: 'MOBI 文件', extensions: ['mobi'] },
              { name: 'TXT 文件', extensions: ['txt'] },
              { name: '所有文件', extensions: ['*'] }
            ],
            properties: ['openFile']
          });
          
          if (result.canceled || result.filePaths.length === 0) {
            throw this.createError(ErrorType.FILE_NOT_FOUND, '用户取消了文件选择');
          }
          
          targetPath = result.filePaths[0];
        }
        
        const book = await this.fileSystemService.importBook(targetPath);
        const bookId = await this.databaseService.saveBook(book);
        
        // 确保返回给渲染进程的数据类型正确
        const cleanBook = {
          ...book,
          id: bookId,
          author: typeof book.author === 'string' ? book.author : 
                 (book.author && typeof book.author === 'object' && book.author._ ? 
                  book.author._ : '未知作者')
        };
        
        return { book: cleanBook } as BookImportResponse;
      });
    });

    // 获取所有书籍
    ipcMain.handle('book:get-all', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        return await this.databaseService.getBooks();
      });
    });

    // 获取单本书籍
    ipcMain.handle('book:get', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        return await this.databaseService.getBook(bookId);
      });
    });

    // 删除书籍
    ipcMain.handle('book:delete', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        await this.databaseService.deleteBook(bookId);
        await this.cacheService.invalidateCache(bookId);
        await this.fileSystemService.clearCache(bookId);
      });
    });

    // 更新书籍信息
    ipcMain.handle('book:update', async (event, request: IPCRequest<{ bookId: string; updates: any }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId, updates } = request.data!;
        await this.databaseService.updateBook(bookId, updates);
      });
    });

    // 解析书籍内容
    ipcMain.handle('book:parse-content', async (event, request: IPCRequest<BookContentRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        
        // 首先尝试从缓存获取
        let cachedBook = await this.cacheService.getCache(bookId);
        if (cachedBook) {
          return {
            content: {
              bookId: cachedBook.bookId,
              chapters: cachedBook.chapters,
              toc: cachedBook.toc,
              rawContent: '' // 缓存中不存储原始内容以节省空间
            }
          } as BookContentResponse;
        }
        
        // 缓存不存在，解析内容
        const content = await this.fileSystemService.parseBookContent(bookId);
        
        // 生成缓存
        await this.cacheService.generateCache(bookId, content);
        
        return { content } as BookContentResponse;
      });
    });
  }

  // ============================================================================
  // 阅读进度相关处理器
  // ============================================================================

  private registerProgressHandlers(): void {
    // 保存阅读进度
    ipcMain.handle('progress:save', async (event, request: IPCRequest<ProgressSaveRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId, progress } = request.data!;
        await this.databaseService.saveProgress(bookId, progress);
      });
    });

    // 获取阅读进度
    ipcMain.handle('progress:get', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        return await this.databaseService.getProgress(bookId);
      });
    });

    // 删除阅读进度
    ipcMain.handle('progress:delete', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        await this.databaseService.deleteProgress(bookId);
      });
    });
  }

  // ============================================================================
  // 生词表相关处理器
  // ============================================================================

  private registerVocabularyHandlers(): void {
    // 添加生词
    ipcMain.handle('vocabulary:add', async (event, request: IPCRequest<VocabularyAddRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { word } = request.data!;
        await this.databaseService.addVocabulary(word);
      });
    });

    // 获取生词表
    ipcMain.handle('vocabulary:get', async (event, request: IPCRequest<{ bookId?: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data || {};
        return await this.databaseService.getVocabulary(bookId);
      });
    });

    // 删除生词
    ipcMain.handle('vocabulary:delete', async (event, request: IPCRequest<{ wordId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { wordId } = request.data!;
        await this.databaseService.deleteVocabulary(wordId);
      });
    });

    // 更新生词
    ipcMain.handle('vocabulary:update', async (event, request: IPCRequest<{ wordId: string; updates: any }>) => {
      return this.handleWithTimeout(request, async () => {
        const { wordId, updates } = request.data!;
        await this.databaseService.updateVocabulary(wordId, updates);
      });
    });

    // 标记生词为已掌握
    ipcMain.handle('vocabulary:mark-mastered', async (event, request: IPCRequest<{ wordId: string; mastered: boolean }>) => {
      return this.handleWithTimeout(request, async () => {
        const { wordId, mastered } = request.data!;
        await this.databaseService.markWordAsMastered(wordId, mastered);
      });
    });

    // 导出生词表
    ipcMain.handle('vocabulary:export', async (event, request: IPCRequest<VocabularyExportRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { format, bookId } = request.data!;
        const vocabulary = await this.databaseService.getVocabulary(bookId);
        const filePath = await this.fileSystemService.exportVocabulary(format, vocabulary);
        return { filePath } as VocabularyExportResponse;
      });
    });
  }

  // ============================================================================
  // 设置相关处理器
  // ============================================================================

  private registerSettingsHandlers(): void {
    // 保存阅读设置
    ipcMain.handle('settings:save', async (event, request: IPCRequest<SettingsSaveRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId, settings } = request.data!;
        await this.databaseService.saveSettings(bookId, settings);
      });
    });

    // 获取阅读设置
    ipcMain.handle('settings:get', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        return await this.databaseService.getSettings(bookId);
      });
    });

    // 保存应用设置
    ipcMain.handle('settings:save-app', async (event, request: IPCRequest<AppSettingsSaveRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { settings } = request.data!;
        await this.databaseService.saveAppSettings(settings);
      });
    });

    // 获取应用设置
    ipcMain.handle('settings:get-app', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        return await this.databaseService.getAppSettings();
      });
    });
  }

  // ============================================================================
  // 缓存相关处理器
  // ============================================================================

  private registerCacheHandlers(): void {
    // 生成缓存
    ipcMain.handle('cache:generate', async (event, request: IPCRequest<CacheGenerateRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId, content } = request.data!;
        await this.cacheService.generateCache(bookId, content);
      });
    });

    // 获取缓存
    ipcMain.handle('cache:get', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        return await this.cacheService.getCache(bookId);
      });
    });

    // 使缓存失效
    ipcMain.handle('cache:invalidate', async (event, request: IPCRequest<{ bookId: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data!;
        await this.cacheService.invalidateCache(bookId);
      });
    });

    // 清理缓存
    ipcMain.handle('cache:cleanup', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        await this.cacheService.cleanupCache();
      });
    });

    // 获取缓存大小
    ipcMain.handle('cache:get-size', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        return await this.cacheService.getCacheSize();
      });
    });
  }

  // ============================================================================
  // 翻译相关处理器
  // ============================================================================

  private registerTranslationHandlers(): void {
    // 在线翻译
    ipcMain.handle('translation:translate', async (event, request: IPCRequest<TranslationRequest>) => {
      return this.handleWithTimeout(request, async () => {
        const { text, from, to } = request.data!;
        return await this.translationService.translate(text, from, to);
      });
    });

    // 本地翻译
    ipcMain.handle('translation:get-local', async (event, request: IPCRequest<{ word: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { word } = request.data!;
        return await this.translationService.getLocalTranslation(word);
      });
    });
  }

  // ============================================================================
  // 文件系统相关处理器
  // ============================================================================

  private registerFileSystemHandlers(): void {
    // 验证文件
    ipcMain.handle('fs:validate-file', async (event, request: IPCRequest<{ filePath: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { filePath } = request.data!;
        return await this.fileSystemService.validateFile(filePath);
      });
    });

    // 获取文件信息
    ipcMain.handle('fs:get-file-info', async (event, request: IPCRequest<{ filePath: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { filePath } = request.data!;
        return await this.fileSystemService.getFileInfo(filePath);
      });
    });

    // 清理文件系统缓存
    ipcMain.handle('fs:clear-cache', async (event, request: IPCRequest<{ bookId?: string }>) => {
      return this.handleWithTimeout(request, async () => {
        const { bookId } = request.data || {};
        await this.fileSystemService.clearCache(bookId);
      });
    });
  }

  // ============================================================================
  // 应用管理相关处理器
  // ============================================================================

  private registerAppHandlers(): void {
    // 获取应用版本
    ipcMain.handle('app:get-version', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        const { app } = require('electron');
        return app.getVersion();
      });
    });

    // 获取平台信息
    ipcMain.handle('app:get-platform', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        return process.platform;
      });
    });

    // 退出应用
    ipcMain.handle('app:quit', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        const { app } = require('electron');
        app.quit();
      });
    });

    // 最小化窗口
    ipcMain.handle('app:minimize', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        const { BrowserWindow } = require('electron');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          focusedWindow.minimize();
        }
      });
    });

    // 最大化/还原窗口
    ipcMain.handle('app:maximize', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        const { BrowserWindow } = require('electron');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          if (focusedWindow.isMaximized()) {
            focusedWindow.unmaximize();
          } else {
            focusedWindow.maximize();
          }
        }
      });
    });

    // 切换全屏
    ipcMain.handle('app:toggle-fullscreen', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        const { BrowserWindow } = require('electron');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
        }
      });
    });
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 带超时处理的请求处理器
   */
  private async handleWithTimeout<T>(
    request: IPCRequest,
    handler: () => Promise<T>
  ): Promise<IPCResponse<T>> {
    const startTime = Date.now();
    
    try {
      // 设置超时定时器
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(this.createError(ErrorType.NETWORK_ERROR, '请求超时'));
        }, this.defaultTimeout);
        
        this.requestTimeouts.set(request.id, timeout);
      });

      // 执行处理器
      const resultPromise = handler();
      
      // 等待结果或超时
      const result = await Promise.race([resultPromise, timeoutPromise]);
      
      // 清理超时定时器
      const timeout = this.requestTimeouts.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
        this.requestTimeouts.delete(request.id);
      }
      
      return {
        id: request.id,
        success: true,
        data: result,
        timestamp: Date.now()
      };
      
    } catch (error) {
      // 清理超时定时器
      const timeout = this.requestTimeouts.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
        this.requestTimeouts.delete(request.id);
      }
      
      const appError = this.normalizeError(error);
      
      console.error(`IPC request ${request.channel} failed:`, {
        requestId: request.id,
        error: appError,
        duration: Date.now() - startTime
      });
      
      return {
        id: request.id,
        success: false,
        error: appError,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: unknown): AppError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as AppError;
    }
    
    if (error instanceof Error) {
      return this.createError(ErrorType.PARSE_ERROR, error.message, error);
    }
    
    return this.createError(ErrorType.PARSE_ERROR, '未知错误', error);
  }

  // ============================================================================
  // 自动更新相关处理器
  // ============================================================================

  private registerUpdaterHandlers(): void {
    // 检查更新
    ipcMain.handle('updater:check-for-updates', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        await autoUpdaterService.checkForUpdates();
        return { success: true };
      });
    });

    // 下载更新
    ipcMain.handle('updater:download-update', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        await autoUpdaterService.downloadUpdate();
        return { success: true };
      });
    });

    // 退出并安装更新
    ipcMain.handle('updater:quit-and-install', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        autoUpdaterService.quitAndInstall();
        return { success: true };
      });
    });

    // 获取更新状态
    ipcMain.handle('updater:get-status', async (event, request: IPCRequest) => {
      return this.handleWithTimeout(request, async () => {
        return {
          available: autoUpdaterService.isUpdateAvailable(),
          downloaded: autoUpdaterService.isUpdateDownloaded(),
          version: autoUpdaterService.getCurrentVersion()
        };
      });
    });

    // 设置自动下载
    ipcMain.handle('updater:set-auto-download', async (event, request: IPCRequest<{ enabled: boolean }>) => {
      return this.handleWithTimeout(request, async () => {
        const { enabled } = request.data!;
        autoUpdaterService.setAutoDownload(enabled);
        return { success: true };
      });
    });
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