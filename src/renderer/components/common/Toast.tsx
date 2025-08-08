import React, { useEffect, useState } from 'react';
import { AppError, ErrorType } from '../../../shared/types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    const timer = setTimeout(() => setIsVisible(true), 50);
    
    // 自动关闭
    const duration = message.duration || 5000;
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, [message.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(message.id);
    }, 300);
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (message.type) {
      case 'success': return 'border-green-200 dark:border-green-800';
      case 'error': return 'border-red-200 dark:border-red-800';
      case 'warning': return 'border-yellow-200 dark:border-yellow-800';
      case 'info': return 'border-blue-200 dark:border-blue-800';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getBackgroundColor = () => {
    switch (message.type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20';
      default: return 'bg-white dark:bg-gray-800';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`
        rounded-lg border shadow-lg p-4
        ${getBorderColor()}
        ${getBackgroundColor()}
      `}>
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {message.title}
            </h4>
            {message.message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {message.message}
              </p>
            )}
            
            {/* 操作按钮 */}
            {message.action && (
              <div className="mt-3">
                <button
                  onClick={message.action.onClick}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {message.action.label}
                </button>
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast 容器组件
interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onRemove }) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {messages.map((message) => (
        <div key={message.id} className="pointer-events-auto">
          <Toast message={message} onClose={onRemove} />
        </div>
      ))}
    </div>
  );
};

// Toast 管理 Hook
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { ...toast, id };
    
    setMessages(prev => [...prev, newToast]);
    
    return id;
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAllToasts = () => {
    setMessages([]);
  };

  // 便捷方法
  const showSuccess = (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return addToast({ type: 'success', title, message, ...options });
  };

  const showError = (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return addToast({ type: 'error', title, message, duration: 8000, ...options });
  };

  const showWarning = (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return addToast({ type: 'warning', title, message, ...options });
  };

  const showInfo = (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return addToast({ type: 'info', title, message, ...options });
  };

  // 从 AppError 创建错误 Toast
  const showErrorFromAppError = (error: AppError, title?: string) => {
    const errorTitle = title || getErrorTitle(error.type);
    const errorMessage = error.message;
    
    return showError(errorTitle, errorMessage, {
      action: error.recoverable ? {
        label: '重试',
        onClick: () => {
          // 这里可以添加重试逻辑
          console.log('Retry action triggered');
        }
      } : undefined
    });
  };

  return {
    messages,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showErrorFromAppError
  };
};

// 根据错误类型获取标题
const getErrorTitle = (errorType: ErrorType): string => {
  switch (errorType) {
    case ErrorType.FILE_NOT_FOUND:
      return '文件未找到';
    case ErrorType.UNSUPPORTED_FORMAT:
      return '不支持的文件格式';
    case ErrorType.PARSE_ERROR:
      return '解析失败';
    case ErrorType.CACHE_ERROR:
      return '缓存错误';
    case ErrorType.DATABASE_ERROR:
      return '数据库错误';
    case ErrorType.NETWORK_ERROR:
      return '网络错误';
    case ErrorType.PERMISSION_ERROR:
      return '权限错误';
    case ErrorType.STORAGE_FULL:
      return '存储空间不足';
    default:
      return '未知错误';
  }
};

export default Toast;