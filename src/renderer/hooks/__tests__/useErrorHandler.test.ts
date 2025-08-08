import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { AppError, ErrorType } from '../../../shared/types';
import * as ErrorLogger from '../../services/ErrorLogger';

// Mock the ErrorLogger
jest.mock('../../services/ErrorLogger', () => ({
  logError: jest.fn(),
  createError: jest.fn((type, message, details, recoverable) => ({
    type,
    message,
    details,
    recoverable,
    timestamp: new Date(),
  })),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
  });

  it('handles AppError correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const appError: AppError = {
      type: ErrorType.NETWORK_ERROR,
      message: '网络错误',
      timestamp: new Date(),
      recoverable: true,
    };

    act(() => {
      result.current.handleError(appError);
    });

    expect(result.current.error).toBe(appError);
    expect(ErrorLogger.logError).toHaveBeenCalledWith(appError, undefined);
  });

  it('converts JavaScript Error to AppError', () => {
    const { result } = renderHook(() => useErrorHandler());
    const jsError = new Error('JavaScript错误');

    act(() => {
      result.current.handleError(jsError);
    });

    expect(ErrorLogger.createError).toHaveBeenCalledWith(
      ErrorType.PARSE_ERROR,
      'JavaScript错误',
      {
        name: 'Error',
        stack: jsError.stack,
      },
      true
    );
    expect(result.current.error).toBeTruthy();
  });

  it('handles error with context', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('测试错误');
    const context = { userId: '123', action: 'import' };

    act(() => {
      result.current.handleError(error, context);
    });

    expect(ErrorLogger.logError).toHaveBeenCalledWith(
      expect.any(Object),
      context
    );
  });

  it('clears error correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('测试错误');

    act(() => {
      result.current.handleError(error);
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('creates and handles error correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.createAndHandleError(
        ErrorType.FILE_NOT_FOUND,
        '文件未找到',
        { filePath: '/test/path' },
        false,
        { operation: 'fileRead' }
      );
    });

    expect(ErrorLogger.createError).toHaveBeenCalledWith(
      ErrorType.FILE_NOT_FOUND,
      '文件未找到',
      { filePath: '/test/path' },
      false
    );
    expect(result.current.error).toBeTruthy();
  });

  it('withErrorHandling handles successful async operation', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const asyncFn = jest.fn().mockResolvedValue('success');

    let handlingResult: string | null;
    await act(async () => {
      handlingResult = await result.current.withErrorHandling(asyncFn);
    });

    expect(handlingResult!).toBe('success');
    expect(asyncFn).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('withErrorHandling handles failed async operation', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('异步操作失败');
    const asyncFn = jest.fn().mockRejectedValue(error);

    let handlingResult: string | null;
    await act(async () => {
      handlingResult = await result.current.withErrorHandling(asyncFn);
    });

    expect(handlingResult).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(ErrorLogger.logError).toHaveBeenCalled();
  });

  it('withErrorHandling passes context to error handler', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('异步操作失败');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const context = { operation: 'dataFetch' };

    await act(async () => {
      await result.current.withErrorHandling(asyncFn, context);
    });

    expect(ErrorLogger.logError).toHaveBeenCalledWith(
      expect.any(Object),
      context
    );
  });

  it('handles error without message gracefully', () => {
    const { result } = renderHook(() => useErrorHandler());
    const errorWithoutMessage = new Error();
    errorWithoutMessage.message = '';

    act(() => {
      result.current.handleError(errorWithoutMessage);
    });

    expect(ErrorLogger.createError).toHaveBeenCalledWith(
      ErrorType.PARSE_ERROR,
      '发生了未知错误',
      expect.any(Object),
      true
    );
  });

  it('preserves error details when handling AppError', () => {
    const { result } = renderHook(() => useErrorHandler());
    const appError: AppError = {
      type: ErrorType.DATABASE_ERROR,
      message: '数据库连接失败',
      details: { connectionString: 'sqlite://test.db' },
      timestamp: new Date(),
      recoverable: false,
    };

    act(() => {
      result.current.handleError(appError);
    });

    expect(result.current.error).toEqual(appError);
    expect(ErrorLogger.logError).toHaveBeenCalledWith(appError, undefined);
  });
});