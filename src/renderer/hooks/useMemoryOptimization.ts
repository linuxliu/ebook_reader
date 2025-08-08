// Hook for memory optimization in React components
import { useEffect, useCallback, useRef } from 'react';
import { MemoryMonitor } from '../services/MemoryMonitor';

export interface MemoryOptimizationOptions {
  enableAutoCleanup?: boolean;
  cleanupThreshold?: number; // Memory usage percentage
  cleanupInterval?: number; // Milliseconds
  maxCacheSize?: number;
}

export const useMemoryOptimization = (options: MemoryOptimizationOptions = {}) => {
  const {
    enableAutoCleanup = true,
    cleanupThreshold = 80,
    cleanupInterval = 30000,
    maxCacheSize = 100
  } = options;

  const cacheRef = useRef(new Map<string, any>());
  const cleanupCallbacksRef = useRef<Array<() => void>>([]);
  const lastCleanupRef = useRef(Date.now());

  // Register cleanup with memory monitor
  useEffect(() => {
    if (!enableAutoCleanup) return;

    const monitor = MemoryMonitor.getInstance();
    
    const removeCleanupCallback = monitor.registerCleanupCallback(async () => {
      await performCleanup();
    });

    return removeCleanupCallback;
  }, [enableAutoCleanup]);

  // Periodic cleanup
  useEffect(() => {
    if (!enableAutoCleanup) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastCleanupRef.current > cleanupInterval) {
        performCleanup();
      }
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [enableAutoCleanup, cleanupInterval]);

  const performCleanup = useCallback(async () => {
    console.log('Performing memory cleanup...');
    
    // Clear cache if it's too large
    if (cacheRef.current.size > maxCacheSize) {
      const entries = Array.from(cacheRef.current.entries());
      const toKeep = entries.slice(-Math.floor(maxCacheSize * 0.7)); // Keep 70%
      cacheRef.current.clear();
      toKeep.forEach(([key, value]) => {
        cacheRef.current.set(key, value);
      });
    }

    // Run registered cleanup callbacks
    const callbacks = [...cleanupCallbacksRef.current];
    await Promise.all(callbacks.map(callback => {
      try {
        return Promise.resolve(callback());
      } catch (error) {
        console.error('Cleanup callback error:', error);
        return Promise.resolve();
      }
    }));

    lastCleanupRef.current = Date.now();
    console.log('Memory cleanup completed');
  }, [maxCacheSize]);

  const addToCache = useCallback((key: string, value: any) => {
    // Implement LRU-like behavior
    if (cacheRef.current.has(key)) {
      cacheRef.current.delete(key);
    }
    
    cacheRef.current.set(key, value);
    
    // Auto-cleanup if cache is too large
    if (cacheRef.current.size > maxCacheSize) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
  }, [maxCacheSize]);

  const getFromCache = useCallback((key: string) => {
    const value = cacheRef.current.get(key);
    
    // Move to end (LRU)
    if (value !== undefined) {
      cacheRef.current.delete(key);
      cacheRef.current.set(key, value);
    }
    
    return value;
  }, []);

  const removeFromCache = useCallback((key: string) => {
    return cacheRef.current.delete(key);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const registerCleanupCallback = useCallback((callback: () => void) => {
    cleanupCallbacksRef.current.push(callback);
    
    return () => {
      const index = cleanupCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        cleanupCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize: maxCacheSize,
      usage: (cacheRef.current.size / maxCacheSize) * 100
    };
  }, [maxCacheSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
      cleanupCallbacksRef.current = [];
    };
  }, []);

  return {
    addToCache,
    getFromCache,
    removeFromCache,
    clearCache,
    registerCleanupCallback,
    performCleanup,
    getCacheStats
  };
};

// Hook for optimizing large lists
export const useListOptimization = <T>(
  items: T[],
  options: {
    chunkSize?: number;
    maxVisibleItems?: number;
  } = {}
) => {
  const { chunkSize = 50, maxVisibleItems = 100 } = options;
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: Math.min(maxVisibleItems, items.length) });
  const { addToCache, getFromCache } = useMemoryOptimization();

  const getVisibleItems = useCallback(() => {
    const cacheKey = `visible-${visibleRange.start}-${visibleRange.end}`;
    let cached = getFromCache(cacheKey);
    
    if (!cached) {
      cached = items.slice(visibleRange.start, visibleRange.end);
      addToCache(cacheKey, cached);
    }
    
    return cached;
  }, [items, visibleRange, addToCache, getFromCache]);

  const updateVisibleRange = useCallback((start: number, end: number) => {
    const newStart = Math.max(0, start);
    const newEnd = Math.min(items.length, end);
    
    setVisibleRange({ start: newStart, end: newEnd });
  }, [items.length]);

  const loadMore = useCallback(() => {
    const newEnd = Math.min(visibleRange.end + chunkSize, items.length);
    setVisibleRange(prev => ({ ...prev, end: newEnd }));
  }, [visibleRange.end, chunkSize, items.length]);

  return {
    visibleItems: getVisibleItems(),
    visibleRange,
    updateVisibleRange,
    loadMore,
    hasMore: visibleRange.end < items.length
  };
};

// React import for hooks
import React from 'react';