import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.loadingState).toEqual({
      isLoading: false,
      message: '加载中...',
      progress: undefined,
      error: null,
    });
  });

  it('initializes with custom message', () => {
    const { result } = renderHook(() => useLoadingState('自定义加载消息'));

    expect(result.current.loadingState.message).toBe('自定义加载消息');
  });

  it('starts loading correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ message: '正在处理...' });
    });

    expect(result.current.loadingState).toEqual({
      isLoading: true,
      message: '正在处理...',
      progress: undefined,
      error: null,
    });
  });

  it('starts loading with progress', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ 
        message: '正在上传...', 
        showProgress: true 
      });
    });

    expect(result.current.loadingState).toEqual({
      isLoading: true,
      message: '正在上传...',
      progress: 0,
      error: null,
    });
  });

  it('stops loading correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading();
    });

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.loadingState.isLoading).toBe(false);
  });

  it('sets progress correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ showProgress: true });
    });

    act(() => {
      result.current.setProgress(75);
    });

    expect(result.current.loadingState.progress).toBe(75);
  });

  it('clamps progress between 0 and 100', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ showProgress: true });
    });

    act(() => {
      result.current.setProgress(-10);
    });

    expect(result.current.loadingState.progress).toBe(0);

    act(() => {
      result.current.setProgress(150);
    });

    expect(result.current.loadingState.progress).toBe(100);
  });

  it('sets message correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setMessage('新的加载消息');
    });

    expect(result.current.loadingState.message).toBe('新的加载消息');
  });

  it('sets error correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    const error = new Error('测试错误');

    act(() => {
      result.current.startLoading();
    });

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.loadingState.error).toBe(error);
    expect(result.current.loadingState.isLoading).toBe(false);
  });

  it('handles timeout correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ timeout: 1000 });
    });

    expect(result.current.loadingState.isLoading).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.loadingState.isLoading).toBe(false);
    expect(result.current.loadingState.error).toEqual(new Error('操作超时'));
  });

  it('clears timeout when stopped manually', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading({ timeout: 1000 });
    });

    act(() => {
      result.current.stopLoading();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // 应该保持停止状态，不会因为超时而设置错误
    expect(result.current.loadingState.isLoading).toBe(false);
    expect(result.current.loadingState.error).toBeNull();
  });

  it('withLoading handles successful async operation', async () => {
    const { result } = renderHook(() => useLoadingState());
    const asyncFn = jest.fn().mockResolvedValue('success');

    let loadingResult: string;
    await act(async () => {
      loadingResult = await result.current.withLoading(asyncFn);
    });

    expect(loadingResult!).toBe('success');
    expect(asyncFn).toHaveBeenCalled();
    expect(result.current.loadingState.isLoading).toBe(false);
    expect(result.current.loadingState.error).toBeNull();
  });

  it('withLoading handles failed async operation', async () => {
    const { result } = renderHook(() => useLoadingState());
    const error = new Error('异步操作失败');
    const asyncFn = jest.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.withLoading(asyncFn);
      } catch (e) {
        // 预期会抛出错误
      }
    });

    expect(result.current.loadingState.isLoading).toBe(false);
    expect(result.current.loadingState.error).toBe(error);
  });

  it('withLoading shows loading state during operation', async () => {
    const { result } = renderHook(() => useLoadingState());
    let resolvePromise: (value: string) => void;
    const asyncFn = jest.fn().mockImplementation(() => 
      new Promise<string>(resolve => {
        resolvePromise = resolve;
      })
    );

    const promise = act(async () => {
      return result.current.withLoading(asyncFn, { message: '处理中...' });
    });

    // 在异步操作进行中，应该显示加载状态
    expect(result.current.loadingState.isLoading).toBe(true);
    expect(result.current.loadingState.message).toBe('处理中...');

    // 完成异步操作
    act(() => {
      resolvePromise!('完成');
    });

    await promise;

    expect(result.current.loadingState.isLoading).toBe(false);
  });
});