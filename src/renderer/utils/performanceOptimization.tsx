// React performance optimization utilities
import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';

// Enhanced memo with deep comparison option
export function deepMemo<T extends React.ComponentType<any>>(
  Component: T,
  areEqual?: (prevProps: React.ComponentProps<T>, nextProps: React.ComponentProps<T>) => boolean
): T {
  const MemoizedComponent = memo(Component, areEqual || ((prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  }));

  return MemoizedComponent as T;
}

// Optimized list item component
export const OptimizedListItem = memo<{
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}>(({ id, children, className, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <div 
      key={id}
      className={className}
      onClick={handleClick}
    >
      {children}
    </div>
  );
});

// Debounced input component
export const DebouncedInput = memo<{
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  placeholder?: string;
  className?: string;
}>(({ value, onChange, delay = 300, placeholder, className }) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  }, [onChange, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
});

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Lazy image component with intersection observer
export const LazyImage = memo<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}>(({ src, alt, className, placeholder, onLoad, onError }) => {
  const { elementRef, hasIntersected } = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div ref={elementRef} className={className}>
      {hasIntersected && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      {(!hasIntersected || (!isLoaded && !hasError)) && placeholder && (
        <div className="bg-gray-200 dark:bg-gray-700 animate-pulse">
          {placeholder}
        </div>
      )}
      {hasError && (
        <div className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
});

// Performance monitoring component
export const PerformanceMonitor: React.FC<{
  name: string;
  children: React.ReactNode;
  onMetrics?: (metrics: { renderTime: number; updateCount: number }) => void;
}> = memo(({ name, children, onMetrics }) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - startTime.current;
    
    onMetrics?.({
      renderTime,
      updateCount: renderCount.current
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`${name} rendered in ${renderTime.toFixed(2)}ms (update #${renderCount.current})`);
    }
  });

  useEffect(() => {
    startTime.current = performance.now();
  });

  return <>{children}</>;
});

// Optimized context provider
export function createOptimizedContext<T>() {
  const Context = React.createContext<T | undefined>(undefined);

  const Provider: React.FC<{
    value: T;
    children: React.ReactNode;
  }> = memo(({ value, children }) => {
    const memoizedValue = useMemo(() => value, [value]);
    
    return (
      <Context.Provider value={memoizedValue}>
        {children}
      </Context.Provider>
    );
  });

  const useContext = () => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error('useContext must be used within a Provider');
    }
    return context;
  };

  return { Provider, useContext };
}

// Batch state updates hook
export const useBatchedState = <T,>(initialState: T) => {
  const [state, setState] = React.useState(initialState);
  const batchedUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((update: Partial<T>) => {
    batchedUpdates.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        const updates = batchedUpdates.current;
        batchedUpdates.current = [];
        
        return updates.reduce((acc, update) => ({ ...acc, ...update }), prevState);
      });
    }, 16); // Next frame
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};

// Optimized event handler hook
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);

  // Update callback if dependencies changed
  if (!deps.every((dep, index) => dep === depsRef.current[index])) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
};

// Component size observer hook
export const useComponentSize = () => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.unobserve(element);
    };
  }, []);

  return { elementRef, size };
};