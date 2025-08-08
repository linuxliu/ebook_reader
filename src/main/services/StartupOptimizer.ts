// Startup performance optimization service
import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { BookMetadata } from '../../shared/types';

export interface StartupMetrics {
  startTime: number;
  dbInitTime: number;
  cachePrewarmTime: number;
  totalStartupTime: number;
  recentBooksLoaded: number;
}

export class StartupOptimizer {
  private databaseService: DatabaseService;
  private cacheService: CacheService;
  private metrics: StartupMetrics;

  constructor(databaseService: DatabaseService, cacheService: CacheService) {
    this.databaseService = databaseService;
    this.cacheService = cacheService;
    this.metrics = {
      startTime: Date.now(),
      dbInitTime: 0,
      cachePrewarmTime: 0,
      totalStartupTime: 0,
      recentBooksLoaded: 0
    };
  }

  /**
   * Optimize application startup by preloading critical data
   */
  async optimizeStartup(): Promise<StartupMetrics> {
    const startTime = Date.now();
    this.metrics.startTime = startTime;

    try {
      // Phase 1: Initialize database (critical path)
      const dbStart = Date.now();
      await this.initializeDatabase();
      this.metrics.dbInitTime = Date.now() - dbStart;

      // Phase 2: Preload recent books cache (background)
      const cacheStart = Date.now();
      await this.prewarmRecentBooksCache();
      this.metrics.cachePrewarmTime = Date.now() - cacheStart;

      this.metrics.totalStartupTime = Date.now() - startTime;
      
      console.log('Startup optimization completed:', this.metrics);
      return this.metrics;
    } catch (error) {
      console.error('Startup optimization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database with minimal required data
   */
  private async initializeDatabase(): Promise<void> {
    // Only load essential data during startup
    // Full book list will be loaded lazily when needed
    try {
      // Verify database connection
      await this.databaseService.initialize();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Preload cache for recently accessed books
   */
  private async prewarmRecentBooksCache(): Promise<void> {
    try {
      // Get recently read books (last 5)
      const recentBooks = await this.getRecentBooks(5);
      this.metrics.recentBooksLoaded = recentBooks.length;

      // Preload cache for recent books in background
      const cachePromises = recentBooks.map(async (book) => {
        try {
          // Check if cache exists, if not, skip (don't block startup)
          const hasCache = await this.cacheService.hasCache(book.id);
          if (hasCache) {
            // Preload cache into memory
            await this.cacheService.preloadCache(book.id);
          }
        } catch (error) {
          // Don't fail startup if cache preload fails
          console.warn(`Failed to preload cache for book ${book.id}:`, error);
        }
      });

      // Wait for cache preloading with timeout
      await Promise.race([
        Promise.allSettled(cachePromises),
        new Promise(resolve => setTimeout(resolve, 2000)) // 2s timeout
      ]);

      console.log(`Prewarmed cache for ${recentBooks.length} recent books`);
    } catch (error) {
      // Don't fail startup if cache prewarming fails
      console.warn('Cache prewarming failed:', error);
    }
  }

  /**
   * Get recently accessed books
   */
  private async getRecentBooks(limit: number = 5): Promise<BookMetadata[]> {
    try {
      // Get books sorted by last read date
      const allBooks = await this.databaseService.getBooks();
      return allBooks
        .filter(book => book.lastReadDate)
        .sort((a, b) => {
          const dateA = a.lastReadDate?.getTime() || 0;
          const dateB = b.lastReadDate?.getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent books:', error);
      return [];
    }
  }

  /**
   * Get startup metrics
   */
  getMetrics(): StartupMetrics {
    return { ...this.metrics };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Cleanup any resources if needed
    console.log('StartupOptimizer cleanup completed');
  }
}