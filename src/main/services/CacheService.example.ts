/**
 * CacheService Usage Example
 * 
 * This file demonstrates how to use the CacheService in the main process
 * to manage book content caching for the electron ebook reader.
 */

import { CacheService } from './CacheService';
import { BookContent, CachedBook } from '../../shared/types';

// Example usage of CacheService
export class CacheServiceExample {
  private cacheService: CacheService;

  constructor() {
    // Initialize cache service with default cache directory
    this.cacheService = new CacheService();
  }

  /**
   * Example: Complete cache workflow for a book
   */
  async demonstrateCacheWorkflow() {
    const bookId = 'example-book-123';
    
    // Sample book content (would normally come from a parser)
    const bookContent: BookContent = {
      bookId,
      chapters: [
        {
          id: 'chapter-1',
          title: 'Introduction',
          content: 'This is the introduction chapter...',
          pageCount: 5,
          startPage: 1
        },
        {
          id: 'chapter-2',
          title: 'Getting Started',
          content: 'This chapter covers the basics...',
          pageCount: 10,
          startPage: 6
        }
      ],
      toc: [
        {
          id: 'toc-1',
          title: 'Introduction',
          level: 1,
          page: 1
        },
        {
          id: 'toc-2',
          title: 'Getting Started',
          level: 1,
          page: 6
        }
      ],
      rawContent: 'Complete raw content of the book...'
    };

    try {
      console.log('1. Generating cache for book:', bookId);
      await this.cacheService.generateCache(bookId, bookContent);
      console.log('✓ Cache generated successfully');

      console.log('2. Retrieving cached book...');
      const cachedBook = await this.cacheService.getCache(bookId);
      if (cachedBook) {
        console.log('✓ Cache retrieved successfully');
        console.log('  - Chapters:', cachedBook.chapters.length);
        console.log('  - TOC entries:', cachedBook.toc.length);
        console.log('  - Cache version:', cachedBook.cacheVersion);
        console.log('  - Created at:', cachedBook.createdAt);
      } else {
        console.log('✗ Cache not found');
      }

      console.log('3. Checking cache validity...');
      const isValid = await this.cacheService.isCacheValid(bookId);
      console.log('✓ Cache is valid:', isValid);

      console.log('4. Getting cache statistics...');
      const stats = await this.cacheService.getCacheStats();
      console.log('✓ Cache stats:');
      console.log('  - Total size:', stats.totalSize, 'bytes');
      console.log('  - File count:', stats.fileCount);
      console.log('  - Oldest file:', stats.oldestFile);
      console.log('  - Newest file:', stats.newestFile);

      console.log('5. Updating cache version...');
      await this.cacheService.updateCacheVersion(bookId, '1.1.0');
      console.log('✓ Cache version updated');

      console.log('6. Final cleanup - invalidating cache...');
      await this.cacheService.invalidateCache(bookId);
      console.log('✓ Cache invalidated');

    } catch (error) {
      console.error('Cache workflow failed:', error);
    }
  }

  /**
   * Example: Cache management operations
   */
  async demonstrateCacheManagement() {
    try {
      console.log('Cache Management Operations:');
      
      // Get current cache size
      const currentSize = await this.cacheService.getCacheSize();
      console.log('Current cache size:', currentSize, 'bytes');

      // Clean up old cache files if needed
      await this.cacheService.cleanupCache();
      console.log('✓ Cache cleanup completed');

      // Get updated size after cleanup
      const newSize = await this.cacheService.getCacheSize();
      console.log('Cache size after cleanup:', newSize, 'bytes');

      // Clear all cache if needed
      // await this.cacheService.clearAllCache();
      // console.log('✓ All cache cleared');

    } catch (error) {
      console.error('Cache management failed:', error);
    }
  }

  /**
   * Example: Error handling scenarios
   */
  async demonstrateErrorHandling() {
    try {
      console.log('Error Handling Scenarios:');

      // Try to get cache for non-existent book
      const nonExistentCache = await this.cacheService.getCache('non-existent-book');
      console.log('Non-existent cache result:', nonExistentCache); // Should be null

      // Try to update version for non-existent cache
      try {
        await this.cacheService.updateCacheVersion('non-existent-book', '2.0.0');
      } catch (error: any) {
        console.log('✓ Expected error for non-existent cache:', error.message);
      }

      // Try to invalidate non-existent cache (should not throw)
      await this.cacheService.invalidateCache('non-existent-book');
      console.log('✓ Invalidating non-existent cache handled gracefully');

    } catch (error) {
      console.error('Error handling demonstration failed:', error);
    }
  }
}

// Example usage in main process
export async function runCacheServiceExample() {
  const example = new CacheServiceExample();
  
  console.log('=== CacheService Example ===\n');
  
  await example.demonstrateCacheWorkflow();
  console.log('\n');
  
  await example.demonstrateCacheManagement();
  console.log('\n');
  
  await example.demonstrateErrorHandling();
  
  console.log('\n=== Example Complete ===');
}

// Uncomment to run the example
// runCacheServiceExample().catch(console.error);