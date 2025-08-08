import React, { useEffect, useState } from 'react';
import { AppError, ErrorType } from '../../../shared/types';

interface ErrorNotificationProps {
  error: AppError | null;
  onClose: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onClose,
  onRetry,
  autoClose = false,
  autoCloseDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoClose && !error.recoverable) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // 等待动画完成
  };

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case ErrorType.FILE_NOT_FOUND:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case ErrorType.UNSUPPORTED_FORMAT:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        );
      case ErrorType.STORAGE_FULL:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getErrorTitle = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return '网络连接错误';
      case ErrorType.FILE_NOT_FOUND:
        return '文件未找到';
      case ErrorType.UNSUPPORTED_FORMAT:
        return '不支持的文件格式';
      case ErrorType.PARSE_ERROR:
        return '文件解析错误';
      case ErrorType.CACHE_ERROR:
        return '缓存错误';
      case ErrorType.DATABASE_ERROR:
        return '数据库错误';
      case ErrorType.PERMISSION_ERROR:
        return '权限错误';
      case ErrorType.STORAGE_FULL:
        return '存储空间不足';
      default:
        return '未知错误';
    }
  };

  const getErrorSuggestion = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return '请检查网络连接后重试，或使用离线模式。';
      case ErrorType.FILE_NOT_FOUND:
        return '请确认文件路径正确，或重新选择文件。';
      case ErrorType.UNSUPPORTED_FORMAT:
        return '请选择支持的文件格式：EPUB、PDF、MOBI、TXT。';
      case ErrorType.PARSE_ERROR:
        return '文件可能已损坏，请尝试其他文件或联系技术支持。';
      case ErrorType.CACHE_ERROR:
        return '缓存出现问题，系统将自动重新生成缓存。';
      case ErrorType.DATABASE_ERROR:
        return '数据库访问失败，请重启应用或联系技术支持。';
      case ErrorType.PERMISSION_ERROR:
        return '没有足够的权限访问文件，请检查文件权限设置。';
      case ErrorType.STORAGE_FULL:
        return '存储空间不足，请清理磁盘空间后重试。';
      default:
        return '请尝试重新操作，如问题持续存在请联系技术支持。';
    }
  };

  if (!error || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-red-500 p-4 transform transition-all duration-300 ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-red-500">
              {getErrorIcon(error.type)}
            </div>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {getErrorTitle(error.type)}
            </h3>
            
            <div className="mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {error.message}
              </p>
            </div>
            
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getErrorSuggestion(error.type)}
              </p>
            </div>
            
            {(error.recoverable || onRetry) && (
              <div className="mt-3 flex space-x-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  >
                    重试
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-400">
          {error.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;