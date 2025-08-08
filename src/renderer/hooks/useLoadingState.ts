import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  error?: Error | null;
}

interface LoadingOptions {
  message?: string;
  showProgress?: boolean;
  timeout?: number;
}

interface UseLoadingStateReturn {
  loadingState: LoadingState;
  startLoading: (options?: LoadingOptions) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
  setError: (error: Error | null) => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    options?: LoadingOptions
  ) => Promise<T>;
}

export const useLoadingState = (
  initialMessage = '加载中...'
): UseLoadingStateReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: initialMessage,
    progress: undefined,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((options: LoadingOptions = {}) => {
    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoadingState({
      isLoading: true,
      message: options.message || initialMessage,
      progress: options.showProgress ? 0 : undefined,
      error: null,
    });

    // 设置超时
    if (options.timeout) {
      timeoutRef.current = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('操作超时'),
        }));
      }, options.timeout);
    }
  }, [initialMessage]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setLoadingState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  const withLoading = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: LoadingOptions = {}
    ): Promise<T> => {
      try {
        startLoading(options);
        const result = await asyncFn();
        stopLoading();
        return result;
      } catch (error) {
        setError(error as Error);
        throw error;
      }
    },
    [startLoading, stopLoading, setError]
  );

  return {
    loadingState,
    startLoading,
    stopLoading,
    setProgress,
    setMessage,
    setError,
    withLoading,
  };
};

export default useLoadingState;