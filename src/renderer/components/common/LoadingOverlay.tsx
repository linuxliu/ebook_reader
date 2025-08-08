import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import ProgressBar from './ProgressBar';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100, 如果提供则显示进度条
  canCancel?: boolean;
  onCancel?: () => void;
  backdrop?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = '加载中...',
  progress,
  canCancel = false,
  onCancel,
  backdrop = true,
  size = 'md',
}) => {
  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      {backdrop && (
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      )}
      
      {/* 加载内容 */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mx-4 ${sizeClasses[size]}`}>
        <div className="flex flex-col items-center space-y-4">
          {/* 加载图标或进度条 */}
          {progress !== undefined ? (
            <div className="w-full">
              <ProgressBar
                progress={progress}
                color="primary"
                showPercentage
                animated
              />
            </div>
          ) : (
            <LoadingSpinner size="lg" color="primary" />
          )}
          
          {/* 加载消息 */}
          <div className="text-center">
            <p className="text-gray-900 dark:text-white font-medium">
              {message}
            </p>
            {progress !== undefined && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(progress)}% 完成
              </p>
            )}
          </div>
          
          {/* 取消按钮 */}
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;