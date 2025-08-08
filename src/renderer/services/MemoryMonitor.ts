// Memory monitoring and optimization service
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warning: number; // Percentage
  critical: number; // Percentage
  cleanup: number; // Percentage
}

export class MemoryMonitor {
  private static instance: MemoryMonitor | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;
  private thresholds: MemoryThresholds = {
    warning: 70,
    critical: 85,
    cleanup: 90
  };
  private listeners: Array<(stats: MemoryStats) => void> = [];
  private cleanupCallbacks: Array<() => Promise<void> | void> = [];

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!this.instance) {
      this.instance = new MemoryMonitor();
    }
    return this.instance;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    console.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Memory monitoring stopped');
    }
  }

  /**
   * Get current memory statistics
   */
  getCurrentMemoryStats(): MemoryStats | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
      timestamp: Date.now()
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * Add memory usage listener
   */
  addListener(callback: (stats: MemoryStats) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback: () => Promise<void> | void): () => void {
    this.cleanupCallbacks.push(callback);
    return () => {
      const index = this.cleanupCallbacks.indexOf(callback);
      if (index > -1) {
        this.cleanupCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        console.log('Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }
  }

  /**
   * Trigger memory cleanup
   */
  async triggerCleanup(): Promise<void> {
    console.log('Triggering memory cleanup...');
    
    const cleanupPromises = this.cleanupCallbacks.map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    
    // Force garbage collection if available
    this.forceGarbageCollection();
    
    console.log('Memory cleanup completed');
  }

  /**
   * Set memory thresholds
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(samples: number = 10): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < samples) {
      return 'stable';
    }

    const recent = this.memoryHistory.slice(-samples);
    const first = recent[0].usagePercentage;
    const last = recent[recent.length - 1].usagePercentage;
    const difference = last - first;

    if (Math.abs(difference) < 2) {
      return 'stable';
    }

    return difference > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Check if memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return 'performance' in window && 
           'memory' in performance && 
           typeof (performance as any).memory === 'object';
  }

  /**
   * Check memory usage and trigger actions if needed
   */
  private async checkMemoryUsage(): Promise<void> {
    const stats = this.getCurrentMemoryStats();
    if (!stats) {
      return;
    }

    // Add to history
    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Memory listener error:', error);
      }
    });

    // Check thresholds and trigger actions
    if (stats.usagePercentage >= this.thresholds.cleanup) {
      console.warn(`Memory usage critical: ${stats.usagePercentage.toFixed(1)}%`);
      await this.triggerCleanup();
    } else if (stats.usagePercentage >= this.thresholds.critical) {
      console.warn(`Memory usage high: ${stats.usagePercentage.toFixed(1)}%`);
    } else if (stats.usagePercentage >= this.thresholds.warning) {
      console.log(`Memory usage warning: ${stats.usagePercentage.toFixed(1)}%`);
    }
  }

  /**
   * Format memory size for display
   */
  static formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.memoryHistory = [];
    this.listeners = [];
    this.cleanupCallbacks = [];
  }
}

// Hook for using memory monitoring in React components
export const useMemoryMonitor = () => {
  const [memoryStats, setMemoryStats] = React.useState<MemoryStats | null>(null);
  const [isMonitoring, setIsMonitoring] = React.useState(false);

  React.useEffect(() => {
    const monitor = MemoryMonitor.getInstance();
    
    const removeListener = monitor.addListener((stats) => {
      setMemoryStats(stats);
    });

    // Start monitoring
    monitor.startMonitoring();
    setIsMonitoring(true);

    return () => {
      removeListener();
      setIsMonitoring(false);
    };
  }, []);

  const triggerCleanup = React.useCallback(async () => {
    const monitor = MemoryMonitor.getInstance();
    await monitor.triggerCleanup();
  }, []);

  const getMemoryHistory = React.useCallback(() => {
    const monitor = MemoryMonitor.getInstance();
    return monitor.getMemoryHistory();
  }, []);

  return {
    memoryStats,
    isMonitoring,
    triggerCleanup,
    getMemoryHistory,
    formatMemorySize: MemoryMonitor.formatMemorySize
  };
};

// React import for the hook
import React from 'react';