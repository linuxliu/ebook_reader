import { 
  IPCChannel, 
  IPCRequest, 
  IPCResponse,
  BookMetadata,
  BookContent,
  ReadingProgress,
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  CachedBook,
  TranslationResult,
  BookImportRequest,
  BookContentRequest,
  ProgressSaveRequest,
  VocabularyAddRequest,
  VocabularyExportRequest,
  TranslationRequest,
  SettingsSaveRequest,
  AppSettingsSaveRequest,
  CacheGenerateRequest,
  AppError,
  ErrorType
} from '../../shared/types';

/**
 * IPC 客户端类
 * 负责与主进程进行通信，提供类型安全的 API
 */
export class IPCClient {
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: AppError) => void;
    timeout: NodeJS.Timeout;
  }>();
  private readonly defaultTimeout = 30000; // 30秒超时

  constructor() {
    // 检查 electronAPI 是否可用
    if (!window.electronAPI) {
      throw new Error('Electron API not available. Make sure preload script is loaded.');
    }
  }

  // ============================================================================
  // 书籍管理 API
  // ============================================================================

  /**
   * 导入书籍
   */
  async importBook(filePath?: string): Promise<BookMetadata> {
    const response = await this.sendRequest<BookImportRequest, BookMetadata>('book:import', {
      filePath: filePath || ''
    });
    return response;
  }

  /**
   * 获取所有书籍
   */
  async getAllBooks(): Promise<BookMetadata[]> {
    return await this.sendRequest<void, BookMetadata[]>('book:get-all');
  }

  /**
   * 获取单本书籍
   */
  async getBook(bookId: string): Promise<BookMetadata | null> {
    return await this.sendRequest<{ bookId: string }, BookMetadata | null>('book:get', { bookId });
  }

  /**
   * 删除书籍
   */
  async deleteBook(bookId: string): Promise<void> {
    await this.sendRequest<{ bookId: string }, void>('book:delete', { bookId });
  }

  /**
   * 更新书籍信息
   */
  async updateBook(bookId: string, updates: Partial<BookMetadata>): Promise<void> {
    await this.sendRequest<{ bookId: string; updates: Partial<BookMetadata> }, void>(
      'book:update', 
      { bookId, updates }
    );
  }

  /**
   * 解析书籍内容
   */
  async parseBookContent(bookId: string): Promise<BookContent> {
    const response = await this.sendRequest<BookContentRequest, { content: BookContent }>(
      'book:parse-content', 
      { bookId }
    );
    return response.content;
  }

  // ============================================================================
  // 阅读进度 API
  // ============================================================================

  /**
   * 保存阅读进度
   */
  async saveProgress(bookId: string, progress: ReadingProgress): Promise<void> {
    await this.sendRequest<ProgressSaveRequest, void>('progress:save', { bookId, progress });
  }

  /**
   * 获取阅读进度
   */
  async getProgress(bookId: string): Promise<ReadingProgress | null> {
    return await this.sendRequest<{ bookId: string }, ReadingProgress | null>('progress:get', { bookId });
  }

  /**
   * 删除阅读进度
   */
  async deleteProgress(bookId: string): Promise<void> {
    await this.sendRequest<{ bookId: string }, void>('progress:delete', { bookId });
  }

  // ============================================================================
  // 生词表 API
  // ============================================================================

  /**
   * 添加生词
   */
  async addVocabulary(word: VocabularyItem): Promise<void> {
    await this.sendRequest<VocabularyAddRequest, void>('vocabulary:add', { word });
  }

  /**
   * 获取生词表
   */
  async getVocabulary(bookId?: string): Promise<VocabularyItem[]> {
    return await this.sendRequest<{ bookId?: string }, VocabularyItem[]>('vocabulary:get', { bookId });
  }

  /**
   * 删除生词
   */
  async deleteVocabulary(wordId: string): Promise<void> {
    await this.sendRequest<{ wordId: string }, void>('vocabulary:delete', { wordId });
  }

  /**
   * 更新生词
   */
  async updateVocabulary(wordId: string, updates: Partial<VocabularyItem>): Promise<void> {
    await this.sendRequest<{ wordId: string; updates: Partial<VocabularyItem> }, void>(
      'vocabulary:update', 
      { wordId, updates }
    );
  }

  /**
   * 标记生词为已掌握
   */
  async markWordAsMastered(wordId: string, mastered: boolean): Promise<void> {
    await this.sendRequest<{ wordId: string; mastered: boolean }, void>(
      'vocabulary:mark-mastered', 
      { wordId, mastered }
    );
  }

  /**
   * 导出生词表
   */
  async exportVocabulary(format: 'csv' | 'txt', bookId?: string): Promise<string> {
    const response = await this.sendRequest<VocabularyExportRequest, { filePath: string }>(
      'vocabulary:export', 
      { format, bookId }
    );
    return response.filePath;
  }

  // ============================================================================
  // 设置 API
  // ============================================================================

  /**
   * 保存阅读设置
   */
  async saveSettings(bookId: string, settings: ReadingSettings): Promise<void> {
    await this.sendRequest<SettingsSaveRequest, void>('settings:save', { bookId, settings });
  }

  /**
   * 获取阅读设置
   */
  async getSettings(bookId: string): Promise<ReadingSettings | null> {
    return await this.sendRequest<{ bookId: string }, ReadingSettings | null>('settings:get', { bookId });
  }

  /**
   * 保存应用设置
   */
  async saveAppSettings(settings: AppSettings): Promise<void> {
    await this.sendRequest<AppSettingsSaveRequest, void>('settings:save-app', { settings });
  }

  /**
   * 获取应用设置
   */
  async getAppSettings(): Promise<AppSettings> {
    return await this.sendRequest<void, AppSettings>('settings:get-app');
  }

  // ============================================================================
  // 缓存 API
  // ============================================================================

  /**
   * 生成缓存
   */
  async generateCache(bookId: string, content: BookContent): Promise<void> {
    await this.sendRequest<CacheGenerateRequest, void>('cache:generate', { bookId, content });
  }

  /**
   * 获取缓存
   */
  async getCache(bookId: string): Promise<CachedBook | null> {
    return await this.sendRequest<{ bookId: string }, CachedBook | null>('cache:get', { bookId });
  }

  /**
   * 使缓存失效
   */
  async invalidateCache(bookId: string): Promise<void> {
    await this.sendRequest<{ bookId: string }, void>('cache:invalidate', { bookId });
  }

  /**
   * 清理缓存
   */
  async cleanupCache(): Promise<void> {
    await this.sendRequest<void, void>('cache:cleanup');
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<number> {
    return await this.sendRequest<void, number>('cache:get-size');
  }

  // ============================================================================
  // 翻译 API
  // ============================================================================

  /**
   * 在线翻译
   */
  async translate(text: string, from: string = 'auto', to: string = 'zh-CN'): Promise<TranslationResult> {
    return await this.sendRequest<TranslationRequest, TranslationResult>(
      'translation:translate', 
      { text, from, to }
    );
  }

  /**
   * 本地翻译
   */
  async getLocalTranslation(word: string): Promise<TranslationResult | null> {
    return await this.sendRequest<{ word: string }, TranslationResult | null>(
      'translation:get-local', 
      { word }
    );
  }

  // ============================================================================
  // 文件系统 API
  // ============================================================================

  /**
   * 验证文件
   */
  async validateFile(filePath: string): Promise<boolean> {
    return await this.sendRequest<{ filePath: string }, boolean>('fs:validate-file', { filePath });
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{ size: number; format: string }> {
    return await this.sendRequest<{ filePath: string }, { size: number; format: string }>(
      'fs:get-file-info', 
      { filePath }
    );
  }

  /**
   * 清理文件系统缓存
   */
  async clearFileSystemCache(bookId?: string): Promise<void> {
    await this.sendRequest<{ bookId?: string }, void>('fs:clear-cache', { bookId });
  }

  // ============================================================================
  // 应用管理 API
  // ============================================================================

  /**
   * 获取应用版本
   */
  async getAppVersion(): Promise<string> {
    return await this.sendRequest<void, string>('app:get-version');
  }

  /**
   * 退出应用
   */
  async quitApp(): Promise<void> {
    await this.sendRequest<void, void>('app:quit');
  }

  /**
   * 最小化窗口
   */
  async minimizeWindow(): Promise<void> {
    await this.sendRequest<void, void>('app:minimize');
  }

  /**
   * 最大化/还原窗口
   */
  async maximizeWindow(): Promise<void> {
    await this.sendRequest<void, void>('app:maximize');
  }

  /**
   * 切换全屏
   */
  async toggleFullscreen(): Promise<void> {
    await this.sendRequest<void, void>('app:toggle-fullscreen');
  }

  // ============================================================================
  // 核心通信方法
  // ============================================================================

  /**
   * 发送 IPC 请求
   */
  private async sendRequest<TRequest = void, TResponse = void>(
    channel: IPCChannel,
    data?: TRequest
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const request: IPCRequest<TRequest> = {
        id: requestId,
        channel,
        data,
        timestamp: Date.now()
      };

      // 设置超时处理
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(this.createError(ErrorType.NETWORK_ERROR, '请求超时'));
      }, this.defaultTimeout);

      // 存储待处理的请求
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      // 发送请求到主进程
      this.invokeMain(channel, request)
        .then((response: IPCResponse<TResponse>) => {
          const pendingRequest = this.pendingRequests.get(requestId);
          if (!pendingRequest) return;

          // 清理
          clearTimeout(pendingRequest.timeout);
          this.pendingRequests.delete(requestId);

          if (response.success) {
            resolve(response.data!);
          } else {
            reject(response.error!);
          }
        })
        .catch((error) => {
          const pendingRequest = this.pendingRequests.get(requestId);
          if (!pendingRequest) return;

          // 清理
          clearTimeout(pendingRequest.timeout);
          this.pendingRequests.delete(requestId);

          reject(this.normalizeError(error));
        });
    });
  }

  /**
   * 调用主进程方法
   */
  private async invokeMain(channel: string, request: IPCRequest): Promise<IPCResponse> {
    try {
      // 使用 electronAPI 发送请求
      return await (window.electronAPI as any).invoke(channel, request);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: unknown): AppError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as AppError;
    }
    
    if (error instanceof Error) {
      return this.createError(ErrorType.NETWORK_ERROR, error.message, error);
    }
    
    return this.createError(ErrorType.NETWORK_ERROR, '未知错误', error);
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

  /**
   * 清理所有待处理的请求
   */
  cleanup(): void {
    this.pendingRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(this.createError(ErrorType.NETWORK_ERROR, 'IPC client is being cleaned up'));
    });
    this.pendingRequests.clear();
  }
}

// 创建单例实例
export const ipcClient = new IPCClient();