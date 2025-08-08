import React from 'react';

interface ProgressSaveStatusProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  className?: string;
}

const ProgressSaveStatus: React.FC<ProgressSaveStatusProps> = ({
  isSaving,
  hasUnsavedChanges,
  lastSaveTime,
  className = ''
}) => {
  const formatSaveTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) {
      return '刚刚保存';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前保存`;
    } else {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusIcon = () => {
    if (isSaving) {
      return (
        <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isSaving) {
      return '正在保存...';
    }

    if (hasUnsavedChanges) {
      return '有未保存的更改';
    }

    if (lastSaveTime) {
      return formatSaveTime(lastSaveTime);
    }

    return '未保存';
  };

  const getStatusColor = () => {
    if (isSaving) return 'text-blue-600 dark:text-blue-400';
    if (hasUnsavedChanges) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={`progress-save-status flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {/* 保存状态详情 */}
      {!isSaving && (
        <div className="save-details text-xs text-gray-500 dark:text-gray-400">
          {hasUnsavedChanges && (
            <span className="unsaved-indicator" title="自动保存将在几秒后进行">
              ●
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressSaveStatus;