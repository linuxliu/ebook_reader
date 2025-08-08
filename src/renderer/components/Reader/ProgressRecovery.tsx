import React, { useState, useCallback } from 'react';
import { ReadingProgress } from '../../../shared/types';

interface ProgressRecoveryProps {
  progressHistory: ReadingProgress[];
  currentProgress: ReadingProgress | null;
  onRestore: (progress: ReadingProgress) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
}

const ProgressRecovery: React.FC<ProgressRecoveryProps> = ({
  progressHistory,
  currentProgress,
  onRestore,
  onClose,
  isVisible
}) => {
  const [selectedProgress, setSelectedProgress] = useState<ReadingProgress | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = useCallback(async () => {
    if (!selectedProgress) return;

    try {
      setIsRestoring(true);
      await onRestore(selectedProgress);
      onClose();
    } catch (error) {
      console.error('Failed to restore progress:', error);
    } finally {
      setIsRestoring(false);
    }
  }, [selectedProgress, onRestore, onClose]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressDiff = (progress: ReadingProgress) => {
    if (!currentProgress) return null;
    
    const pageDiff = progress.currentPage - currentProgress.currentPage;
    const percentageDiff = progress.percentage - currentProgress.percentage;
    
    return { pageDiff, percentageDiff };
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              阅读进度恢复
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            选择要恢复的阅读进度版本。系统会自动保存最近的进度记录。
          </p>
        </div>

        {/* Progress List */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {progressHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>没有可用的进度备份</p>
            </div>
          ) : (
            <div className="space-y-3">
              {progressHistory.map((progress, index) => {
                const diff = getProgressDiff(progress);
                const isSelected = selectedProgress?.lastUpdateTime === progress.lastUpdateTime;
                
                return (
                  <div
                    key={`${progress.lastUpdateTime}-${index}`}
                    className={`
                      p-4 rounded-lg border cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                    onClick={() => setSelectedProgress(progress)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            第 {progress.currentPage} 页 ({progress.percentage}%)
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            第 {progress.currentChapter + 1} 章
                          </div>
                        </div>
                        
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {formatTime(new Date(progress.lastUpdateTime))}
                        </div>
                        
                        {diff && (
                          <div className="mt-2 flex items-center space-x-4 text-xs">
                            {diff.pageDiff !== 0 && (
                              <span className={`
                                px-2 py-1 rounded
                                ${diff.pageDiff > 0 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                }
                              `}>
                                {diff.pageDiff > 0 ? '+' : ''}{diff.pageDiff} 页
                              </span>
                            )}
                            {diff.percentageDiff !== 0 && (
                              <span className={`
                                px-2 py-1 rounded
                                ${diff.percentageDiff > 0 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                }
                              `}>
                                {diff.percentageDiff > 0 ? '+' : ''}{diff.percentageDiff}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="ml-4">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedProgress && (
                <span>
                  将恢复到第 {selectedProgress.currentPage} 页 ({selectedProgress.percentage}%)
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              
              <button
                onClick={handleRestore}
                disabled={!selectedProgress || isRestoring}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${selectedProgress && !isRestoring
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {isRestoring ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>恢复中...</span>
                  </div>
                ) : (
                  '恢复进度'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressRecovery;