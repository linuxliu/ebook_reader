import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorType } from '../../../../shared/types';

// 创建一个会抛出错误的组件
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // 抑制控制台错误输出，因为我们故意抛出错误
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    // 重置 console.error mock
    (console.error as jest.Mock).mockClear();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('应用出现错误')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('刷新页面')).toBeInTheDocument();
  });

  it('logs error to localStorage', () => {
    // Mock localStorage.setItem to track calls
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 检查是否调用了 localStorage.setItem
    expect(setItemSpy).toHaveBeenCalled();
    
    // 检查调用参数
    const calls = setItemSpy.mock.calls;
    const errorCall = calls.find(call => call[0].startsWith('error_'));
    expect(errorCall).toBeDefined();
    
    if (errorCall) {
      const errorLog = JSON.parse(errorCall[1]);
      expect(errorLog.message).toBe('Test error');
      expect(errorLog.type).toBe(ErrorType.PARSE_ERROR);
    }
    
    setItemSpy.mockRestore();
  });

  it('calls onError callback when provided', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
        type: ErrorType.PARSE_ERROR,
      }),
      expect.any(Object)
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = (error: any, retry: () => void) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={retry}>Custom retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom retry')).toBeInTheDocument();
  });

  it('resets error state when retry is clicked', () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      React.useEffect(() => {
        // 在重试后不再抛出错误
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      return <ThrowError shouldThrow={shouldThrow} />;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // 应该显示错误界面
    expect(screen.getByText('应用出现错误')).toBeInTheDocument();

    // 点击重试按钮
    fireEvent.click(screen.getByText('重试'));

    // 等待组件重新渲染
    setTimeout(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    }, 200);
  });

  it('includes error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 点击详细信息
    const detailsButton = screen.getByText('查看详细信息');
    fireEvent.click(detailsButton);

    // 应该显示错误详情
    expect(screen.getByText(/"name": "Error"/)).toBeInTheDocument();
  });

  it('displays error timestamp', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/错误时间:/)).toBeInTheDocument();
  });
});