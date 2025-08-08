import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  withPerformanceMonitoring,
  usePerformanceMetrics,
  optimizeReactComponent,
  measureRenderTime,
  debounceCallback,
  throttleCallback,
  memoizeFunction,
  lazyLoadComponent
} from '../performanceOptimization';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance
});

// Test component for HOC testing
const TestComponent: React.FC<{ value: number }> = ({ value }) => {
  return <div data-testid="test-component">Value: {value}</div>;
};

describe('performanceOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withPerformanceMonitoring', () => {
    it('should wrap component with performance monitoring', () => {
      const MonitoredComponent = withPerformanceMonitoring(TestComponent, 'TestComponent');
      
      render(<MonitoredComponent value={42} />);
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Value: 42')).toBeInTheDocument();
    });

    it('should call performance.mark on mount and unmount', () => {
      const MonitoredComponent = withPerformanceMonitoring(TestComponent, 'TestComponent');
      
      const { unmount } = render(<MonitoredComponent value={42} />);
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-mount-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-mount-end');
      
      unmount();
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-unmount');
    });

    it('should measure render time on updates', () => {
      const MonitoredComponent = withPerformanceMonitoring(TestComponent, 'TestComponent');
      
      const { rerender } = render(<MonitoredComponent value={42} />);
      
      rerender(<MonitoredComponent value={43} />);
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-update-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-update-end');
    });
  });

  describe('usePerformanceMetrics', () => {
    const TestHookComponent: React.FC = () => {
      const metrics = usePerformanceMetrics('TestHook');
      
      return (
        <div>
          <div data-testid="render-count">Renders: {metrics.renderCount}</div>
          <div data-testid="mount-time">Mount time: {metrics.mountTime}</div>
        </div>
      );
    };

    it('should track render count', () => {
      const { rerender } = render(<TestHookComponent />);
      
      expect(screen.getByTestId('render-count')).toHaveTextContent('Renders: 1');
      
      rerender(<TestHookComponent />);
      
      expect(screen.getByTestId('render-count')).toHaveTextContent('Renders: 2');
    });

    it('should track mount time', () => {
      mockPerformance.now.mockReturnValue(1000);
      
      render(<TestHookComponent />);
      
      expect(screen.getByTestId('mount-time')).toHaveTextContent('Mount time: 1000');
    });
  });

  describe('optimizeReactComponent', () => {
    const SimpleComponent: React.FC<{ name: string; age: number }> = ({ name, age }) => {
      return <div>{name} is {age} years old</div>;
    };

    it('should memoize component', () => {
      const OptimizedComponent = optimizeReactComponent(SimpleComponent);
      
      const { rerender } = render(<OptimizedComponent name="John" age={25} />);
      
      expect(screen.getByText('John is 25 years old')).toBeInTheDocument();
      
      // Re-render with same props should not cause re-render
      rerender(<OptimizedComponent name="John" age={25} />);
      
      expect(screen.getByText('John is 25 years old')).toBeInTheDocument();
    });

    it('should re-render when props change', () => {
      const OptimizedComponent = optimizeReactComponent(SimpleComponent);
      
      const { rerender } = render(<OptimizedComponent name="John" age={25} />);
      
      rerender(<OptimizedComponent name="Jane" age={30} />);
      
      expect(screen.getByText('Jane is 30 years old')).toBeInTheDocument();
    });
  });

  describe('measureRenderTime', () => {
    it('should measure and return render time', async () => {
      const renderFunction = jest.fn().mockResolvedValue('result');
      
      mockPerformance.now
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time
      
      const result = await measureRenderTime('test-operation', renderFunction);
      
      expect(result.result).toBe('result');
      expect(result.renderTime).toBe(50);
      expect(renderFunction).toHaveBeenCalled();
    });

    it('should handle synchronous functions', async () => {
      const syncFunction = jest.fn().mockReturnValue('sync-result');
      
      mockPerformance.now
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(2025);
      
      const result = await measureRenderTime('sync-operation', syncFunction);
      
      expect(result.result).toBe('sync-result');
      expect(result.renderTime).toBe(25);
    });

    it('should handle function errors', async () => {
      const errorFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(measureRenderTime('error-operation', errorFunction))
        .rejects.toThrow('Test error');
    });
  });

  describe('debounceCallback', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounceCallback(mockFn, 100);
      
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should cancel previous calls when called again', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounceCallback(mockFn, 100);
      
      debouncedFn('first');
      
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      debouncedFn('second');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });

    it('should allow immediate execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounceCallback(mockFn, 100, true);
      
      debouncedFn('immediate');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('immediate');
    });
  });

  describe('throttleCallback', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = throttleCallback(mockFn, 100);
      
      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      throttledFn('call4');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('call4');
    });

    it('should execute trailing call after throttle period', () => {
      const mockFn = jest.fn();
      const throttledFn = throttleCallback(mockFn, 100);
      
      throttledFn('first');
      throttledFn('second');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('second');
    });
  });

  describe('memoizeFunction', () => {
    it('should cache function results', () => {
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoizedFn = memoizeFunction(expensiveFn);
      
      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);
      
      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });

    it('should handle different arguments', () => {
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoizedFn = memoizeFunction(expensiveFn);
      
      const result1 = memoizedFn(5);
      const result2 = memoizedFn(10);
      const result3 = memoizedFn(5);
      
      expect(result1).toBe(10);
      expect(result2).toBe(20);
      expect(result3).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple arguments', () => {
      const expensiveFn = jest.fn((x: number, y: number) => x + y);
      const memoizedFn = memoizeFunction(expensiveFn);
      
      const result1 = memoizedFn(1, 2);
      const result2 = memoizedFn(1, 2);
      const result3 = memoizedFn(2, 3);
      
      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(result3).toBe(5);
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });

    it('should respect cache size limit', () => {
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoizedFn = memoizeFunction(expensiveFn, 2);
      
      memoizedFn(1); // Cache: [1]
      memoizedFn(2); // Cache: [1, 2]
      memoizedFn(3); // Cache: [2, 3] (1 evicted)
      memoizedFn(1); // Should call function again
      
      expect(expensiveFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('lazyLoadComponent', () => {
    it('should create lazy component', () => {
      const mockImport = jest.fn().mockResolvedValue({
        default: TestComponent
      });
      
      const LazyComponent = lazyLoadComponent(mockImport);
      
      expect(LazyComponent).toBeDefined();
      expect(mockImport).not.toHaveBeenCalled(); // Should not import immediately
    });

    it('should handle loading state', async () => {
      const mockImport = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({ default: TestComponent }), 100);
        })
      );
      
      const LazyComponent = lazyLoadComponent(mockImport);
      
      render(
        <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <LazyComponent value={42} />
        </React.Suspense>
      );
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Wait for promise resolution
      });
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });
  });

  describe('integration scenarios', () => {
    it('should work together for comprehensive optimization', async () => {
      // Create an optimized component with monitoring
      const OptimizedComponent = optimizeReactComponent(
        withPerformanceMonitoring(TestComponent, 'OptimizedTest')
      );
      
      // Create memoized expensive calculation
      const expensiveCalc = memoizeFunction((x: number) => {
        let result = 0;
        for (let i = 0; i < x; i++) {
          result += i;
        }
        return result;
      });
      
      // Create debounced update function
      const updateFn = jest.fn();
      const debouncedUpdate = debounceCallback(updateFn, 50);
      
      // Render component
      render(<OptimizedComponent value={expensiveCalc(100)} />);
      
      // Test debounced updates
      debouncedUpdate('update1');
      debouncedUpdate('update2');
      
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      expect(updateFn).toHaveBeenCalledTimes(1);
      expect(updateFn).toHaveBeenCalledWith('update2');
      
      // Verify performance monitoring was called
      expect(mockPerformance.mark).toHaveBeenCalledWith('OptimizedTest-mount-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('OptimizedTest-mount-end');
    });
  });
});