import { Worker } from 'worker_threads';
import * as path from 'path';
import { ErrorType, AppError } from '../../shared/types';

export interface WorkerResult<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  fallbackData?: T;
}

export class WorkerManager {
  private static instance: WorkerManager;
  private activeWorkers = new Map<string, Worker>();
  private workerCount = 0;
  private readonly maxWorkers = 4; // 最大并发 worker 数量

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  /**
   * 在 worker 中执行 EPUB 解析任务
   */
  async executeEpubTask<T>(
    action: 'parseMetadata' | 'parseContent',
    filePath: string,
    bookId: string,
    timeoutMs: number = 30000
  ): Promise<WorkerResult<T>> {
    return new Promise((resolve, reject) => {
      // 检查是否超过最大 worker 数量
      if (this.activeWorkers.size >= this.maxWorkers) {
        reject(this.createError(
          ErrorType.NETWORK_ERROR,
          'Too many active workers, please try again later'
        ));
        return;
      }

      const workerId = `epub-worker-${++this.workerCount}`;
      // 在打包后的应用中，worker 文件在同一目录下的 workers 文件夹
      const workerPath = path.join(__dirname, 'workers/epubWorker.js');
      console.log(`Creating worker with path: ${workerPath}`);
      
      try {
        const worker = new Worker(workerPath, {
          workerData: {
            action,
            filePath,
            bookId
          }
        });

        this.activeWorkers.set(workerId, worker);

        // 设置超时
        const timeout = setTimeout(() => {
          this.terminateWorker(workerId);
          reject(this.createError(
            ErrorType.NETWORK_ERROR,
            `Worker timeout after ${timeoutMs}ms`
          ));
        }, timeoutMs);

        // 监听消息
        worker.on('message', (result: WorkerResult<T>) => {
          clearTimeout(timeout);
          this.terminateWorker(workerId);
          resolve(result);
        });

        // 监听错误
        worker.on('error', (error) => {
          console.error(`Worker ${workerId} error:`, error);
          clearTimeout(timeout);
          this.terminateWorker(workerId);
          reject(this.createError(
            ErrorType.PARSE_ERROR,
            `Worker error: ${error.message}`,
            error
          ));
        });

        // 监听退出
        worker.on('exit', (code) => {
          console.log(`Worker ${workerId} exited with code ${code}`);
          clearTimeout(timeout);
          this.terminateWorker(workerId);
          if (code !== 0) {
            reject(this.createError(
              ErrorType.PARSE_ERROR,
              `Worker stopped with exit code ${code}`
            ));
          }
        });

      } catch (error) {
        this.terminateWorker(workerId);
        reject(this.createError(
          ErrorType.PARSE_ERROR,
          `Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error
        ));
      }
    });
  }

  /**
   * 终止指定的 worker
   */
  private terminateWorker(workerId: string): void {
    const worker = this.activeWorkers.get(workerId);
    if (worker) {
      try {
        worker.terminate();
      } catch (error) {
        console.warn(`Failed to terminate worker ${workerId}:`, error);
      }
      this.activeWorkers.delete(workerId);
    }
  }

  /**
   * 终止所有活跃的 workers
   */
  terminateAllWorkers(): void {
    for (const [workerId] of this.activeWorkers) {
      this.terminateWorker(workerId);
    }
  }

  /**
   * 获取活跃 worker 数量
   */
  getActiveWorkerCount(): number {
    return this.activeWorkers.size;
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

  /**
   * 清理资源
   */
  cleanup(): void {
    this.terminateAllWorkers();
  }
}