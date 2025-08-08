import { AppError, ErrorType } from '../../shared/types';

interface ErrorLogEntry {
  id: string;
  error: AppError;
  context?: Record<string, unknown>;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

interface ErrorReportConfig {
  maxLogEntries: number;
  enableRemoteReporting: boolean;
  remoteEndpoint?: string;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
}

class ErrorLogger {
  private config: ErrorReportConfig;
  private sessionId: string;
  private logQueue: ErrorLogEntry[] = [];

  constructor(config: Partial<ErrorReportConfig> = {}) {
    this.config = {
      maxLogEntries: 100,
      enableRemoteReporting: false,
      enableLocalStorage: true,
      enableConsoleLogging: true,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredLogs(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const storedLogs = localStorage.getItem('error_logs');
      if (storedLogs) {
        const logs = JSON.parse(storedLogs) as ErrorLogEntry[];
        this.logQueue = logs.slice(-this.config.maxLogEntries);
      }
    } catch (error) {
      console.warn('Failed to load stored error logs:', error);
    }
  }

  private saveLogsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      localStorage.setItem('error_logs', JSON.stringify(this.logQueue));
    } catch (error) {
      console.warn('Failed to save error logs to storage:', error);
    }
  }

  public logError(
    error: AppError,
    context?: Record<string, unknown>
  ): void {
    const logEntry: ErrorLogEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: {
        ...error,
        timestamp: new Date(), // 确保时间戳是最新的
      },
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    // 添加到队列
    this.logQueue.push(logEntry);

    // 保持队列大小限制
    if (this.logQueue.length > this.config.maxLogEntries) {
      this.logQueue = this.logQueue.slice(-this.config.maxLogEntries);
    }

    // 控制台日志
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // 本地存储
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage();
    }

    // 远程上报
    if (this.config.enableRemoteReporting) {
      this.reportToRemote(logEntry);
    }
  }

  private logToConsole(logEntry: ErrorLogEntry): void {
    const { error, context } = logEntry;
    
    console.group(`🚨 Error [${error.type}] - ${error.timestamp.toISOString()}`);
    console.error('Message:', error.message);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    if (context) {
      console.error('Context:', context);
    }
    
    console.error('Session ID:', logEntry.sessionId);
    console.error('User Agent:', logEntry.userAgent);
    console.error('URL:', logEntry.url);
    console.groupEnd();
  }

  private async reportToRemote(logEntry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.warn('Failed to report error to remote endpoint:', error);
    }
  }

  public getErrorLogs(filter?: {
    type?: ErrorType;
    since?: Date;
    limit?: number;
  }): ErrorLogEntry[] {
    let logs = [...this.logQueue];

    if (filter) {
      if (filter.type) {
        logs = logs.filter(log => log.error.type === filter.type);
      }
      
      if (filter.since) {
        logs = logs.filter(log => log.error.timestamp >= filter.since!);
      }
      
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs.sort((a, b) => 
      b.error.timestamp.getTime() - a.error.timestamp.getTime()
    );
  }

  public clearLogs(): void {
    this.logQueue = [];
    
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('error_logs');
    }
  }

  public getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: number;
    sessionErrors: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const errorsByType = {} as Record<ErrorType, number>;
    let recentErrors = 0;
    let sessionErrors = 0;

    this.logQueue.forEach(log => {
      // 按类型统计
      errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1;
      
      // 最近一小时的错误
      if (log.error.timestamp >= oneHourAgo) {
        recentErrors++;
      }
      
      // 当前会话的错误
      if (log.sessionId === this.sessionId) {
        sessionErrors++;
      }
    });

    return {
      totalErrors: this.logQueue.length,
      errorsByType,
      recentErrors,
      sessionErrors,
    };
  }

  public exportLogs(): string {
    const logs = this.getErrorLogs();
    return JSON.stringify(logs, null, 2);
  }

  public updateConfig(newConfig: Partial<ErrorReportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局实例
export const errorLogger = new ErrorLogger({
  maxLogEntries: 100,
  enableRemoteReporting: false, // 在生产环境中可以启用
  enableLocalStorage: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
});

// 便捷函数
export const logError = (
  error: AppError,
  context?: Record<string, unknown>
) => {
  errorLogger.logError(error, context);
};

export const createError = (
  type: ErrorType,
  message: string,
  details?: unknown,
  recoverable = true
): AppError => {
  return {
    type,
    message,
    details,
    timestamp: new Date(),
    recoverable,
  };
};

export default ErrorLogger;