// Lazy loading service for React components and resources
import { lazy, ComponentType } from 'react';

export interface LazyLoadOptions {
  fallback?: ComponentType;
  preload?: boolean;
  timeout?: number;
}

export class LazyLoader {
  private static preloadedComponents = new Set<string>();
  private static componentCache = new Map<string, ComponentType<any>>();

  /**
   * Create a lazy-loaded component with enhanced features
   */
  static createLazyComponent<T = {}>(
    importFn: () => Promise<{ default: ComponentType<T> }>,
    componentName: string,
    options: LazyLoadOptions = {}
  ): ComponentType<T> {
    const { preload = false, timeout = 10000 } = options;

    // Check if component is already cached
    if (this.componentCache.has(componentName)) {
      return this.componentCache.get(componentName)!;
    }

    // Create lazy component with timeout
    const LazyComponent = lazy(() => {
      return Promise.race([
        importFn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Component ${componentName} failed to load within ${timeout}ms`));
          }, timeout);
        })
      ]);
    });

    // Cache the component
    this.componentCache.set(componentName, LazyComponent);

    // Preload if requested
    if (preload) {
      this.preloadComponent(importFn, componentName);
    }

    return LazyComponent;
  }

  /**
   * Preload a component without rendering it
   */
  static async preloadComponent(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    componentName: string
  ): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    try {
      await importFn();
      this.preloadedComponents.add(componentName);
      console.log(`Preloaded component: ${componentName}`);
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }

  /**
   * Preload multiple components
   */
  static async preloadComponents(
    components: Array<{
      importFn: () => Promise<{ default: ComponentType<any> }>;
      name: string;
    }>
  ): Promise<void> {
    const preloadPromises = components.map(({ importFn, name }) =>
      this.preloadComponent(importFn, name)
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Check if a component has been preloaded
   */
  static isPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }

  /**
   * Clear preload cache
   */
  static clearCache(): void {
    this.preloadedComponents.clear();
    this.componentCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    preloadedCount: number;
    cachedCount: number;
    preloadedComponents: string[];
  } {
    return {
      preloadedCount: this.preloadedComponents.size,
      cachedCount: this.componentCache.size,
      preloadedComponents: Array.from(this.preloadedComponents)
    };
  }
}

// Resource lazy loader for non-component resources
export class ResourceLoader {
  private static loadedResources = new Map<string, any>();
  private static loadingPromises = new Map<string, Promise<any>>();

  /**
   * Load a resource lazily with caching
   */
  static async loadResource<T>(
    resourceKey: string,
    loader: () => Promise<T>,
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<T> {
    const { cache = true, timeout = 5000 } = options;

    // Return cached resource if available
    if (cache && this.loadedResources.has(resourceKey)) {
      return this.loadedResources.get(resourceKey);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(resourceKey)) {
      return this.loadingPromises.get(resourceKey)!;
    }

    // Create loading promise with timeout
    const loadingPromise = Promise.race([
      loader(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Resource ${resourceKey} failed to load within ${timeout}ms`));
        }, timeout);
      })
    ]);

    this.loadingPromises.set(resourceKey, loadingPromise);

    try {
      const resource = await loadingPromise;
      
      if (cache) {
        this.loadedResources.set(resourceKey, resource);
      }
      
      this.loadingPromises.delete(resourceKey);
      return resource;
    } catch (error) {
      this.loadingPromises.delete(resourceKey);
      throw error;
    }
  }

  /**
   * Preload resources in background
   */
  static async preloadResources(
    resources: Array<{
      key: string;
      loader: () => Promise<any>;
    }>
  ): Promise<void> {
    const preloadPromises = resources.map(({ key, loader }) =>
      this.loadResource(key, loader, { cache: true }).catch(error => {
        console.warn(`Failed to preload resource ${key}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear resource cache
   */
  static clearCache(): void {
    this.loadedResources.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get resource cache statistics
   */
  static getCacheStats(): {
    loadedCount: number;
    loadingCount: number;
    loadedResources: string[];
  } {
    return {
      loadedCount: this.loadedResources.size,
      loadingCount: this.loadingPromises.size,
      loadedResources: Array.from(this.loadedResources.keys())
    };
  }
}