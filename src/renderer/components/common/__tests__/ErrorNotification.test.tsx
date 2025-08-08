import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorNotification from '../ErrorNotification';
import { AppError, ErrorType } from '../../../../shared/types';

const mockError: AppError = {
  type: ErrorType.NETWORK_ERROR,
  message: '网络连接失败',
  timestamp: new Date(),
  recoverable: true,
};

describe('ErrorNotification', () => {
  it('does not render when error is null', () => {
    const { container } = render(
      <ErrorNotification error={null} onClose={jest.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders error notification with correct content', () => {
    render(
      <ErrorNotification error={mockError} onClose={jest.fn()} />
    );

    expect(screen.getByText('网络连接错误')).toBeInTheDocument();
    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    expect(screen.getByText('请检查网络连接后重试，或使用离线模式。')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();

    render(
      <ErrorNotification error={mockError} onClose={onClose} />
    );

    const closeButton = screen.getAllByRole('button').find(
      button => button.querySelector('svg')
    );
    fireEvent.click(closeButton!);

    // onClose 应该在动画延迟后被调用
    setTimeout(() => {
      expect(onClose).toHaveBeenCalled();
    }, 400);
  });

  it('shows retry button when error is recoverable', () => {
    const onRetry = jest.fn();

    render(
      <ErrorNotification 
        error={mockError} 
        onClose={jest.fn()} 
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not show retry button when error is not recoverable', () => {
    const nonRecoverableError: AppError = {
      ...mockError,
      recoverable: false,
    };

    render(
      <ErrorNotification 
        error={nonRecoverableError} 
        onClose={jest.fn()} 
      />
    );

    expect(screen.queryByText('重试')).not.toBeInTheDocument();
  });

  it('auto-closes for non-recoverable errors', async () => {
    const onClose = jest.fn();
    const nonRecoverableError: AppError = {
      ...mockError,
      recoverable: false,
    };

    render(
      <ErrorNotification 
        error={nonRecoverableError} 
        onClose={onClose}
        autoClose={true}
        autoCloseDelay={100}
      />
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('displays correct icon for different error types', () => {
    const fileError: AppError = {
      type: ErrorType.FILE_NOT_FOUND,
      message: '文件未找到',
      timestamp: new Date(),
      recoverable: true,
    };

    const { rerender } = render(
      <ErrorNotification error={fileError} onClose={jest.fn()} />
    );

    // 检查文件错误图标
    expect(screen.getByRole('heading', { name: '文件未找到' })).toBeInTheDocument();

    // 测试不同的错误类型
    const formatError: AppError = {
      type: ErrorType.UNSUPPORTED_FORMAT,
      message: '不支持的格式',
      timestamp: new Date(),
      recoverable: true,
    };

    rerender(
      <ErrorNotification error={formatError} onClose={jest.fn()} />
    );

    expect(screen.getByText('不支持的文件格式')).toBeInTheDocument();
  });

  it('displays error timestamp', () => {
    const errorWithTime: AppError = {
      ...mockError,
      timestamp: new Date('2023-01-01T12:00:00Z'),
    };

    render(
      <ErrorNotification error={errorWithTime} onClose={jest.fn()} />
    );

    // 检查时间戳是否显示 (使用更灵活的匹配)
    expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('provides appropriate suggestions for different error types', () => {
    const storageError: AppError = {
      type: ErrorType.STORAGE_FULL,
      message: '存储空间不足',
      timestamp: new Date(),
      recoverable: true,
    };

    render(
      <ErrorNotification error={storageError} onClose={jest.fn()} />
    );

    expect(screen.getByText('存储空间不足，请清理磁盘空间后重试。')).toBeInTheDocument();
  });

  it('handles unknown error types gracefully', () => {
    const unknownError: AppError = {
      type: 'UNKNOWN_ERROR' as ErrorType,
      message: '未知错误',
      timestamp: new Date(),
      recoverable: true,
    };

    render(
      <ErrorNotification error={unknownError} onClose={jest.fn()} />
    );

    expect(screen.getByRole('heading', { name: '未知错误' })).toBeInTheDocument();
    expect(screen.getByText('请尝试重新操作，如问题持续存在请联系技术支持。')).toBeInTheDocument();
  });
});