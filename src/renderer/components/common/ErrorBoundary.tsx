import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorType } from '../../../shared/types';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 将 JavaScript Error 转换为 AppError
    const appError: AppError = {
      type: ErrorType.PARSE_ERROR,
      message: error.message || '发生了未知错误',
      details: {
        name: error.name,
        stack: error.stack,
      },
      timestamp: new Date(),
      recoverable: true,
    };

    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError: AppError = {
      type: ErrorType.PARSE_ERROR,
      message: error.message || '发生了未知错误',
      details: {
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date(),
      recoverable: true,
    };

    // 记录错误日志
    this.logError(appError, errorInfo);

    // 调用外部错误处理器
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  private logError = (error: AppError, errorInfo?: ErrorInfo) => {
    // 发送错误到日志服务
    console.error('ErrorBoundary caught an error:', error);
    if (errorInfo) {
      console.error('Component stack:', errorInfo.componentStack);
    }

    // 这里可以集成错误上报服务
    // 例如：Sentry, LogRocket 等
    try {
      // 存储到本地日志
      const errorLog = {
        ...error,
        componentStack: errorInfo?.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      localStorage.setItem(
        `error_${Date.now()}`,
        JSON.stringify(errorLog)
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // 默认错误界面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  应用出现错误
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {this.state.error.message}
              </p>
              {this.state.error.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    查看详细信息
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(this.state.error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                刷新页面
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              错误时间: {this.state.error.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 高阶组件，用于包装其他组件
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: AppError, retry: () => void) => ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;