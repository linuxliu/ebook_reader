// Resource optimization service for static assets and bundles
export interface ResourceMetrics {
  totalSize: number;
  compressedSize: number;
  loadTime: number;
  cacheHitRate: number;
}

export class ResourceOptimizer {
  private static resourceCache = new Map<string, any>();
  private static loadTimes = new Map<string, number>();
  private static cacheHits = 0;
  private static cacheMisses = 0;

  /**
   * Load and cache static resources with compression
   */
  static async loadResource<T>(
    url: string,
    options: {
      cache?: boolean;
      compress?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { cache = true, timeout = 5000 } = options;
    const startTime = performance.now();

    // Check cache first
    if (cache && this.resourceCache.has(url)) {
      this.cacheHits++;
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(url, loadTime);
      return this.resourceCache.get(url);
    }

    this.cacheMisses++;

    try {
      // Load resource with timeout
      const resource = await Promise.race([
        this.fetchResource<T>(url),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Resource ${url} failed to load within ${timeout}ms`));
          }, timeout);
        })
      ]);

      const loadTime = performance.now() - startTime;
      this.loadTimes.set(url, loadTime);

      if (cache) {
        this.resourceCache.set(url, resource);
      }

      return resource;
    } catch (error) {
      console.error(`Failed to load resource ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetch resource with optional compression
   */
  private static async fetchResource<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Determine content type and parse accordingly
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    } else if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    } else {
      return response.blob() as unknown as T;
    }
  }

  /**
   * Preload critical resources
   */
  static async preloadCriticalResources(): Promise<void> {
    const criticalResources: string[] = [
      // Add critical CSS, fonts, or other resources here
      // Example: '/fonts/main.woff2',
      // Example: '/css/critical.css'
    ];

    const preloadPromises = criticalResources.map(url =>
      this.loadResource(url, { cache: true }).catch(error => {
        console.warn(`Failed to preload critical resource ${url}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
    console.log('Critical resources preloaded');
  }

  /**
   * Optimize images with lazy loading and compression
   */
  static optimizeImage(
    src: string,
    options: {
      lazy?: boolean;
      quality?: number;
      format?: 'webp' | 'avif' | 'original';
    } = {}
  ): {
    src: string;
    loading: 'lazy' | 'eager';
    decoding: 'async';
  } {
    const { lazy = true, quality = 80, format = 'webp' } = options;

    // In a real implementation, you might transform the URL to use
    // an image optimization service or CDN
    let optimizedSrc = src;
    
    // Example: Add quality and format parameters
    if (src.includes('?')) {
      optimizedSrc += `&quality=${quality}&format=${format}`;
    } else {
      optimizedSrc += `?quality=${quality}&format=${format}`;
    }

    return {
      src: optimizedSrc,
      loading: lazy ? 'lazy' : 'eager',
      decoding: 'async'
    };
  }

  /**
   * Bundle splitting and code splitting utilities (simplified for Electron)
   */
  static async loadChunk(chunkName: string): Promise<any> {
    console.warn(`loadChunk called with ${chunkName}, but code splitting is disabled in Electron build`);
    // Return a fallback since we're not using code splitting
    return { default: null };
  }

  /**
   * Service worker registration for caching (disabled in Electron)
   */
  static async registerServiceWorker(): Promise<void> {
    // Service Workers are not needed in Electron apps
    // Electron has its own caching mechanisms
    console.log('Service Worker registration skipped (Electron environment)');
  }

  /**
   * Get resource optimization metrics
   */
  static getMetrics(): ResourceMetrics {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    
    const loadTimes = Array.from(this.loadTimes.values());
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    return {
      totalSize: this.resourceCache.size,
      compressedSize: 0, // Would need actual compression data
      loadTime: averageLoadTime,
      cacheHitRate
    };
  }

  /**
   * Clear resource cache
   */
  static clearCache(): void {
    this.resourceCache.clear();
    this.loadTimes.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Prefetch resources for next navigation
   */
  static prefetchResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Preconnect to external domains
   */
  static preconnectDomains(domains: string[]): void {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  }
}