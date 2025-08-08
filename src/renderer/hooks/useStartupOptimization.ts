// Hook for managing startup performance optimizations
import { useEffect, useState, useCallback } from 'react';
import { ResourceOptimizer } from '../services/ResourceOptimizer';
import { preloadAllComponents } from '../components/LazyComponents';

export interface StartupMetrics {
  appStartTime: number;
  componentsLoadTime: number;
  resourcesLoadTime: number;
  totalStartupTime: number;
  isOptimized: boolean;
}

export const useStartupOptimization = () => {
  const [metrics, setMetrics] = useState<StartupMetrics>({
    appStartTime: 0,
    componentsLoadTime: 0,
    resourcesLoadTime: 0,
    totalStartupTime: 0,
    isOptimized: false
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeStartup = useCallback(async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    const startTime = performance.now();

    try {
      // Phase 1: Preload critical resources
      const resourcesStart = performance.now();
      await ResourceOptimizer.preloadCriticalResources();
      const resourcesTime = performance.now() - resourcesStart;

      // Phase 2: Preload components in background
      const componentsStart = performance.now();
      await preloadAllComponents();
      const componentsTime = performance.now() - componentsStart;

      // Phase 3: Register service worker for caching
      await ResourceOptimizer.registerServiceWorker();

      // Phase 4: Preconnect to external domains
      ResourceOptimizer.preconnectDomains([
        'https://api.youdao.com',
        'https://fonts.googleapis.com'
      ]);

      const totalTime = performance.now() - startTime;

      setMetrics({
        appStartTime: startTime,
        componentsLoadTime: componentsTime,
        resourcesLoadTime: resourcesTime,
        totalStartupTime: totalTime,
        isOptimized: true
      });

      console.log('Startup optimization completed:', {
        resourcesTime: `${resourcesTime.toFixed(2)}ms`,
        componentsTime: `${componentsTime.toFixed(2)}ms`,
        totalTime: `${totalTime.toFixed(2)}ms`
      });

    } catch (error) {
      console.error('Startup optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing]);

  // Auto-optimize on mount
  useEffect(() => {
    // Delay optimization to not block initial render
    const timeoutId = setTimeout(() => {
      optimizeStartup();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [optimizeStartup]);

  // Performance monitoring
  useEffect(() => {
    if (metrics.isOptimized) {
      // Report performance metrics
      if ('performance' in window && 'measure' in performance) {
        try {
          performance.mark('startup-optimization-complete');
          performance.measure(
            'startup-optimization',
            'navigationStart',
            'startup-optimization-complete'
          );
        } catch (error) {
          // Ignore performance API errors
        }
      }
    }
  }, [metrics.isOptimized]);

  const getResourceMetrics = useCallback(() => {
    return ResourceOptimizer.getMetrics();
  }, []);

  const clearOptimizationCache = useCallback(() => {
    ResourceOptimizer.clearCache();
    setMetrics(prev => ({ ...prev, isOptimized: false }));
  }, []);

  return {
    metrics,
    isOptimizing,
    optimizeStartup,
    getResourceMetrics,
    clearOptimizationCache
  };
};