import React from 'react';
import { ImportProgress as ImportProgressType } from '../../../shared/types';
import ProgressBar from './ProgressBar';
import LoadingSpinner from './LoadingSpinner';

interface ImportProgressProps {
  importProgress: ImportProgressType | null;
  onCancel?: () => void;
  className?: string;
}

const ImportProgress: React.FC<ImportProgressProps> = ({
  importProgress,
  onCancel,
  className = '',
}) => {
  if (!importProgress) return null;

  const getStageText = (stage: ImportProgressType['stage']) => {
    switch (stage) {
      case 'parsing':
        return '正在解析文件...';
      case 'caching':
        return '正在生成缓存...';
      case 'saving':
        return '正在保存到数据库...';
      case 'complete':
        return '导入完成';
      case 'error':
        return '导入失败';
      default:
        return '处理中...';
    }
  };

  const getStageIcon = (stage: ImportProgressType['stage']) => {
    switch (stage) {
      case 'parsing':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'caching':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'saving':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        );
      case 'complete':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return <LoadingSpinner size="sm" color="primary" />;
    }
  };

  const getProgressColor = (stage: ImportProgressType['stage']) => {
    switch (stage) {
      case 'complete':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStageIcon(importProgress.stage)}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {importProgress.fileName}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getStageText(importProgress.stage)}
            </p>
          </div>
        </div>
        
        {onCancel && importProgress.stage !== 'complete' && importProgress.stage !== 'error' && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 进度条 */}
      {importProgress.stage !== 'error' && (
        <ProgressBar
          progress={importProgress.progress}
          color={getProgressColor(importProgress.stage)}
          size="sm"
          animated={importProgress.stage !== 'complete'}
        />
      )}

      {/* 错误信息 */}
      {importProgress.stage === 'error' && importProgress.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            {importProgress.error.message}
          </p>
        </div>
      )}

      {/* 完成状态 */}
      {importProgress.stage === 'complete' && (
        <div className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          导入成功
        </div>
      )}
    </div>
  );
};

export default ImportProgress;