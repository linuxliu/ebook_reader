import { BookContent, Chapter } from '../../shared/types';

export interface PageChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  chapterIndex: number;
}

export interface PaginationConfig {
  chunkSize: number; // Characters per chunk
  preloadChunks: number; // Number of chunks to preload
  maxCachedChunks: number; // Maximum chunks to keep in memory
}

export class PaginationService {
  private chunks: Map<string, PageChunk[]> = new Map();
  private loadedChunks: Map<string, Set<number>> = new Map();
  private chunkCache: Map<string, Map<number, PageChunk>> = new Map();
  private lastAccessTime: Map<string, Map<number, number>> = new Map();
  private config: PaginationConfig;
  private memoryMonitor: NodeJS.Timeout | null = null;

  constructor(config: PaginationConfig = {
    chunkSize: 5000, // 5000 characters per chunk
    preloadChunks: 3,
    maxCachedChunks: 20
  }) {
    this.config = config;
    this.startMemoryMonitoring();
  }

  /**
   * Initialize pagination for a book
   */
  async initializePagination(bookId: string, content: BookContent): Promise<void> {
    const chunks: PageChunk[] = [];
    let globalIndex = 0;

    for (let chapterIndex = 0; chapterIndex < content.chapters.length; chapterIndex++) {
      const chapter = content.chapters[chapterIndex];
      const chapterChunks = this.chunkifyChapter(chapter, chapterIndex, globalIndex);
      chunks.push(...chapterChunks);
      globalIndex += chapter.content.length;
    }

    this.chunks.set(bookId, chunks);
    this.loadedChunks.set(bookId, new Set());
  }

  /**
   * Get a specific page chunk with caching
   */
  getChunk(bookId: string, chunkIndex: number): PageChunk | null {
    const chunks = this.chunks.get(bookId);
    if (!chunks || chunkIndex >= chunks.length) {
      return null;
    }

    // Check cache first
    const bookCache = this.chunkCache.get(bookId);
    if (bookCache?.has(chunkIndex)) {
      this.updateAccessTime(bookId, chunkIndex);
      return bookCache.get(chunkIndex)!;
    }

    // Load chunk and cache it
    const chunk = chunks[chunkIndex];
    this.cacheChunk(bookId, chunkIndex, chunk);

    const loadedSet = this.loadedChunks.get(bookId);
    if (loadedSet) {
      loadedSet.add(chunkIndex);
      this.cleanupOldChunks(bookId, chunkIndex);
    }

    return chunk;
  }

  /**
   * Get chunks for a page range with preloading
   */
  getChunksInRange(bookId: string, startChunk: number, endChunk: number): PageChunk[] {
    const chunks = this.chunks.get(bookId);
    if (!chunks) return [];

    const result: PageChunk[] = [];
    const actualStart = Math.max(0, startChunk);
    const actualEnd = Math.min(chunks.length - 1, endChunk);

    for (let i = actualStart; i <= actualEnd; i++) {
      const chunk = this.getChunk(bookId, i);
      if (chunk) {
        result.push(chunk);
      }
    }

    // Preload adjacent chunks
    this.preloadAdjacentChunks(bookId, startChunk, endChunk);

    return result;
  }

  /**
   * Get total number of chunks for a book
   */
  getTotalChunks(bookId: string): number {
    const chunks = this.chunks.get(bookId);
    return chunks ? chunks.length : 0;
  }

  /**
   * Find chunk index by character position
   */
  findChunkByPosition(bookId: string, position: number): number {
    const chunks = this.chunks.get(bookId);
    if (!chunks) return 0;

    for (let i = 0; i < chunks.length; i++) {
      if (position >= chunks[i].startIndex && position <= chunks[i].endIndex) {
        return i;
      }
    }

    return 0;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(bookId: string): { loadedChunks: number; totalChunks: number; memoryUsage: number } {
    const chunks = this.chunks.get(bookId);
    const loadedSet = this.loadedChunks.get(bookId);
    
    if (!chunks || !loadedSet) {
      return { loadedChunks: 0, totalChunks: 0, memoryUsage: 0 };
    }

    const memoryUsage = Array.from(loadedSet).reduce((total, chunkIndex) => {
      const chunk = chunks[chunkIndex];
      return total + (chunk ? chunk.content.length * 2 : 0); // Approximate bytes (UTF-16)
    }, 0);

    return {
      loadedChunks: loadedSet.size,
      totalChunks: chunks.length,
      memoryUsage
    };
  }

  /**
   * Clear all cached data for a book
   */
  clearBookCache(bookId: string): void {
    this.chunks.delete(bookId);
    this.loadedChunks.delete(bookId);
    this.chunkCache.delete(bookId);
    this.lastAccessTime.delete(bookId);
  }

  /**
   * Force garbage collection of unused chunks
   */
  forceCleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [bookId, accessTimes] of this.lastAccessTime.entries()) {
      const bookCache = this.chunkCache.get(bookId);
      if (!bookCache) continue;

      const chunksToRemove: number[] = [];
      for (const [chunkIndex, lastAccess] of accessTimes.entries()) {
        if (now - lastAccess > maxAge) {
          chunksToRemove.push(chunkIndex);
        }
      }

      chunksToRemove.forEach(chunkIndex => {
        bookCache.delete(chunkIndex);
        accessTimes.delete(chunkIndex);
      });
    }
  }

  /**
   * Get detailed memory statistics
   */
  getDetailedMemoryStats(): {
    totalBooks: number;
    totalCachedChunks: number;
    estimatedMemoryUsage: number;
    bookStats: Array<{
      bookId: string;
      cachedChunks: number;
      memoryUsage: number;
    }>;
  } {
    let totalCachedChunks = 0;
    let estimatedMemoryUsage = 0;
    const bookStats: Array<{
      bookId: string;
      cachedChunks: number;
      memoryUsage: number;
    }> = [];

    for (const [bookId, bookCache] of this.chunkCache.entries()) {
      let bookMemory = 0;
      for (const chunk of bookCache.values()) {
        bookMemory += chunk.content.length * 2; // UTF-16 approximation
      }

      bookStats.push({
        bookId,
        cachedChunks: bookCache.size,
        memoryUsage: bookMemory
      });

      totalCachedChunks += bookCache.size;
      estimatedMemoryUsage += bookMemory;
    }

    return {
      totalBooks: this.chunkCache.size,
      totalCachedChunks,
      estimatedMemoryUsage,
      bookStats
    };
  }

  /**
   * Cleanup service resources
   */
  cleanup(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
    this.chunks.clear();
    this.loadedChunks.clear();
    this.chunkCache.clear();
    this.lastAccessTime.clear();
  }

  private chunkifyChapter(chapter: Chapter, chapterIndex: number, startIndex: number): PageChunk[] {
    const chunks: PageChunk[] = [];
    const content = chapter.content;
    let currentIndex = 0;

    while (currentIndex < content.length) {
      const chunkEnd = Math.min(currentIndex + this.config.chunkSize, content.length);
      const chunkContent = content.substring(currentIndex, chunkEnd);

      chunks.push({
        id: `${chapter.id}-chunk-${chunks.length}`,
        content: chunkContent,
        startIndex: startIndex + currentIndex,
        endIndex: startIndex + chunkEnd - 1,
        chapterIndex
      });

      currentIndex = chunkEnd;
    }

    return chunks;
  }

  private preloadAdjacentChunks(bookId: string, startChunk: number, endChunk: number): void {
    const chunks = this.chunks.get(bookId);
    if (!chunks) return;

    const preloadStart = Math.max(0, startChunk - this.config.preloadChunks);
    const preloadEnd = Math.min(chunks.length - 1, endChunk + this.config.preloadChunks);

    for (let i = preloadStart; i <= preloadEnd; i++) {
      if (i < startChunk || i > endChunk) {
        // Preload chunk (just mark as accessed)
        this.getChunk(bookId, i);
      }
    }
  }

  private cacheChunk(bookId: string, chunkIndex: number, chunk: PageChunk): void {
    if (!this.chunkCache.has(bookId)) {
      this.chunkCache.set(bookId, new Map());
      this.lastAccessTime.set(bookId, new Map());
    }

    const bookCache = this.chunkCache.get(bookId)!;
    const accessTimes = this.lastAccessTime.get(bookId)!;

    bookCache.set(chunkIndex, chunk);
    accessTimes.set(chunkIndex, Date.now());
  }

  private updateAccessTime(bookId: string, chunkIndex: number): void {
    const accessTimes = this.lastAccessTime.get(bookId);
    if (accessTimes) {
      accessTimes.set(chunkIndex, Date.now());
    }
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    this.memoryMonitor = setInterval(() => {
      this.forceCleanup();
    }, 30000);
  }

  private cleanupOldChunks(bookId: string, currentChunk: number): void {
    const loadedSet = this.loadedChunks.get(bookId);
    const bookCache = this.chunkCache.get(bookId);
    const accessTimes = this.lastAccessTime.get(bookId);

    if (!loadedSet || !bookCache || !accessTimes) {
      return;
    }

    if (bookCache.size <= this.config.maxCachedChunks) {
      return;
    }

    // Remove chunks that are far from current position
    const chunksToRemove: number[] = [];
    const keepDistance = this.config.preloadChunks * 2;

    for (const chunkIndex of loadedSet) {
      if (Math.abs(chunkIndex - currentChunk) > keepDistance) {
        chunksToRemove.push(chunkIndex);
      }
    }

    // Remove oldest chunks if still over limit
    if (bookCache.size - chunksToRemove.length > this.config.maxCachedChunks) {
      const sortedChunks = Array.from(accessTimes.entries())
        .sort((a, b) => a[1] - b[1]) // Sort by access time (oldest first)
        .map(([chunkIndex]) => chunkIndex);
      
      const additionalToRemove = bookCache.size - chunksToRemove.length - this.config.maxCachedChunks;
      chunksToRemove.push(...sortedChunks.slice(0, additionalToRemove));
    }

    // Remove chunks from all caches
    chunksToRemove.forEach(chunkIndex => {
      loadedSet.delete(chunkIndex);
      bookCache.delete(chunkIndex);
      accessTimes.delete(chunkIndex);
    });
  }
}

export const paginationService = new PaginationService();