import { useState, useCallback } from 'react';
import { AppError, ErrorType } from '../../shared/types';
import { logError, createError } from '../services/ErrorLogger';

interface UseErrorHandlerReturn {
  error: AppError | null;
  clearError: () => void;
  handleError: (error: Error | AppError, context?: Record<string, unknown>) => void;
  createAndHandleError: (
    type: ErrorType,
    message: string,
    details?: unknown,
    recoverable?: boolean,
    context?: Record<string, unknown>
  ) => void;
  withErrorHandling: <T>(
    asyncFn: () => Promise<T>,
    context?: Record<string, unknown>
  ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<AppError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((
    error: Error | AppError,
    context?: Record<string, unknown>
  ) => {
    let appError: AppError;

    if ('type' in error && 'timestamp' in error) {
      // 已经是 AppError
      appError = error as AppError;
    } else {
      // 转换 JavaScript Error 为 AppError
      const jsError = error as Error;
      appError = createError(
        ErrorType.PARSE_ERROR,
        jsError.message || '发生了未知错误',
        {
          name: jsError.name,
          stack: jsError.stack,
        },
        true
      );
    }

    // 记录错误
    logError(appError, context);

    // 设置当前错误状态
    setError(appError);
  }, []);

  const createAndHandleError = useCallback((
    type: ErrorType,
    message: string,
    details?: unknown,
    recoverable = true,
    context?: Record<string, unknown>
  ) => {
    const appError = createError(type, message, details, recoverable);
    handleError(appError, context);
  }, [handleError]);

  const withErrorHandling = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [handleError]);

  return {
    error,
    clearError,
    handleError,
    createAndHandleError,
    withErrorHandling,
  };
};

export default useErrorHandler;