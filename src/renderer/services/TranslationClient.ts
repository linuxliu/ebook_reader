import { TranslationResult } from '../../shared/types';
import { IPCClient } from './IPCClient';

/**
 * Translation client for renderer process
 * Handles communication with the main process translation service
 */
export class TranslationClient {
  private ipcClient: IPCClient;
  private cache = new Map<string, { result: TranslationResult; timestamp: number }>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.ipcClient = new IPCClient();
  }

  /**
   * Translate text using online or local translation service
   */
  async translate(text: string, from: string = 'auto', to: string = 'zh-CN'): Promise<TranslationResult> {
    const cacheKey = `${text}-${from}-${to}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.ipcClient.invoke('translation:translate', {
        text,
        from,
        to
      });

      // Cache the result
      this.cacheResult(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Translation failed:', error);
      
      // Try local translation as fallback
      try {
        const localResult = await this.getLocalTranslation(text);
        if (localResult) {
          return localResult;
        }
      } catch (localError) {
        console.error('Local translation also failed:', localError);
      }

      // Return a basic fallback result
      return {
        word: text,
        translation: '翻译失败',
        source: 'local'
      };
    }
  }

  /**
   * Get translation from local dictionary
   */
  async getLocalTranslation(word: string): Promise<TranslationResult | null> {
    try {
      return await this.ipcClient.invoke('translation:get-local', { word });
    } catch (error) {
      console.error('Local translation failed:', error);
      return null;
    }
  }

  /**
   * Batch translate multiple words
   */
  async translateBatch(words: string[], from: string = 'auto', to: string = 'zh-CN'): Promise<TranslationResult[]> {
    const promises = words.map(word => this.translate(word, from, to));
    return Promise.all(promises);
  }

  /**
   * Check if a word exists in local dictionary
   */
  async hasLocalTranslation(word: string): Promise<boolean> {
    const result = await this.getLocalTranslation(word);
    return result !== null;
  }

  /**
   * Get cached translation result
   */
  private getCachedResult(key: string): TranslationResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      return cached.result;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Cache translation result
   */
  private cacheResult(key: string, result: TranslationResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Preload common words for better performance
   */
  async preloadCommonWords(words: string[]): Promise<void> {
    const batchSize = 5;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      await this.translateBatch(batch);
      
      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get translation with retry logic
   */
  async translateWithRetry(
    text: string, 
    from: string = 'auto', 
    to: string = 'zh-CN',
    maxRetries: number = 3
  ): Promise<TranslationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.translate(text, from, to);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Translation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, return fallback
    console.error(`Translation failed after ${maxRetries} attempts:`, lastError);
    return {
      word: text,
      translation: '翻译失败',
      source: 'local'
    };
  }

  /**
   * Detect if text needs translation
   */
  needsTranslation(text: string, userLanguage: string = 'zh-CN'): boolean {
    const cleanText = text.trim();
    
    if (cleanText.length === 0) return false;
    if (cleanText.length > 100) return false; // Too long
    
    const hasChinese = /[\u4e00-\u9fff]/.test(cleanText);
    const hasEnglish = /[a-zA-Z]/.test(cleanText);
    
    if (userLanguage === 'zh-CN') {
      // For Chinese users, translate English text
      return hasEnglish && !hasChinese;
    } else {
      // For English users, translate Chinese text
      return hasChinese && !hasEnglish;
    }
  }

  /**
   * Get suggested translation direction based on text
   */
  getSuggestedDirection(text: string): { from: string; to: string } {
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    
    if (hasChinese && !hasEnglish) {
      return { from: 'zh-CN', to: 'en' };
    } else if (hasEnglish && !hasChinese) {
      return { from: 'en', to: 'zh-CN' };
    } else {
      return { from: 'auto', to: 'zh-CN' };
    }
  }
}