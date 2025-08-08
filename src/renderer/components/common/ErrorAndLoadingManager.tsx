import React from 'react';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';

export const ErrorAndLoadingManager: React.FC = () => {
  const { error, hasError, clearError } = useError();
  const { loading } = useLoading();

  if (!hasError && !loading) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Global Loading Indicator */}
      {loading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
            <span className="text-blue-800 dark:text-blue-200 text-sm">
              加载中...
            </span>
          </div>
        </div>
      )}

      {/* Global Error Display */}
      {hasError && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-red-800 dark:text-red-200 font-medium text-sm">
                错误
              </h3>
              <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                {error.message}
              </p>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};