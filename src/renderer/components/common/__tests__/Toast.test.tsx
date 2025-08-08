import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import Toast, { ToastContainer, useToast, ToastMessage } from '../Toast';
import { ErrorType } from '../../../../shared/types';

describe('Toast', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders success toast correctly', () => {
    const message: ToastMessage = {
      id: 'test-1',
      type: 'success',
      title: 'Success Title',
      message: 'Success message'
    };

    render(<Toast message={message} onClose={mockOnClose} />);

    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders error toast correctly', () => {
    const message: ToastMessage = {
      id: 'test-2',
      type: 'error',
      title: 'Error Title',
      message: 'Error message'
    };

    render(<Toast message={message} onClose={mockOnClose} />);

    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('auto-closes after duration', async () => {
    const message: ToastMessage = {
      id: 'test-3',
      type: 'info',
      title: 'Info Title',
      duration: 1000
    };

    render(<Toast message={message} onClose={mockOnClose} />);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-3');
    });
  });

  it('handles manual close', () => {
    const message: ToastMessage = {
      id: 'test-4',
      type: 'warning',
      title: 'Warning Title'
    };

    render(<Toast message={message} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // Fast-forward the close animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledWith('test-4');
  });

  it('renders action button when provided', () => {
    const mockAction = jest.fn();
    const message: ToastMessage = {
      id: 'test-5',
      type: 'info',
      title: 'Info Title',
      action: {
        label: 'Action Button',
        onClick: mockAction
      }
    };

    render(<Toast message={message} onClose={mockOnClose} />);

    const actionButton = screen.getByText('Action Button');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalled();
  });
});

describe('ToastContainer', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders multiple toasts', () => {
    const messages: ToastMessage[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Success 1'
      },
      {
        id: 'toast-2',
        type: 'error',
        title: 'Error 1'
      }
    ];

    render(<ToastContainer messages={messages} onRemove={mockOnRemove} />);

    expect(screen.getByText('Success 1')).toBeInTheDocument();
    expect(screen.getByText('Error 1')).toBeInTheDocument();
  });

  it('renders empty container when no messages', () => {
    const { container } = render(<ToastContainer messages={[]} onRemove={mockOnRemove} />);
    
    expect(container.firstChild?.childNodes).toHaveLength(0);
  });
});

describe('useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('adds and removes toasts', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.messages).toHaveLength(0);

    // Add a toast
    act(() => {
      result.current.showSuccess('Success Title', 'Success message');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('success');
    expect(result.current.messages[0].title).toBe('Success Title');

    // Remove the toast
    act(() => {
      result.current.removeToast(result.current.messages[0].id);
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('creates different types of toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success');
      result.current.showError('Error');
      result.current.showWarning('Warning');
      result.current.showInfo('Info');
    });

    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[0].type).toBe('success');
    expect(result.current.messages[1].type).toBe('error');
    expect(result.current.messages[2].type).toBe('warning');
    expect(result.current.messages[3].type).toBe('info');
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success 1');
      result.current.showSuccess('Success 2');
      result.current.showError('Error 1');
    });

    expect(result.current.messages).toHaveLength(3);

    act(() => {
      result.current.clearAllToasts();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('creates error toast from AppError', () => {
    const { result } = renderHook(() => useToast());

    const appError = {
      type: ErrorType.PARSE_ERROR,
      message: 'Parse failed',
      timestamp: new Date(),
      recoverable: true
    };

    act(() => {
      result.current.showErrorFromAppError(appError);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('error');
    expect(result.current.messages[0].title).toBe('解析失败');
    expect(result.current.messages[0].message).toBe('Parse failed');
    expect(result.current.messages[0].action).toBeDefined();
  });

  it('creates error toast from non-recoverable AppError without action', () => {
    const { result } = renderHook(() => useToast());

    const appError = {
      type: ErrorType.PERMISSION_ERROR,
      message: 'Permission denied',
      timestamp: new Date(),
      recoverable: false
    };

    act(() => {
      result.current.showErrorFromAppError(appError);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('error');
    expect(result.current.messages[0].title).toBe('权限错误');
    expect(result.current.messages[0].message).toBe('Permission denied');
    expect(result.current.messages[0].action).toBeUndefined();
  });
});