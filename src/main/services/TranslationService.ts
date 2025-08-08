import { TranslationService, TranslationResult } from '../../shared/types';

interface YoudaoResponse {
  errorCode: string;
  query: string;
  translation: string[];
  basic?: {
    phonetic?: string;
    explains: string[];
  };
  web?: Array<{
    key: string;
    value: string[];
  }>;
}

interface LocalDictEntry {
  word: string;
  translation: string;
  pronunciation?: string;
  definitions?: string[];
}

export class TranslationServiceImpl implements TranslationService {
  private cache = new Map<string, TranslationResult>();
  private localDict = new Map<string, LocalDictEntry>();
  private readonly YOUDAO_API_URL = 'https://fanyi.youdao.com/translate';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.initializeLocalDict();
  }

  async translate(text: string, from: string = 'auto', to: string = 'zh-CN'): Promise<TranslationResult> {
    const cacheKey = `${text}-${from}-${to}`;
    
    // Check cache first
    const cached = this.getCachedTranslation(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try online translation first
      const onlineResult = await this.translateOnline(text, from, to);
      this.cacheTranslation(cacheKey, onlineResult);
      return onlineResult;
    } catch (error) {
      console.warn('Online translation failed, trying local dictionary:', error);
      
      // Fallback to local dictionary
      const localResult = await this.getLocalTranslation(text);
      if (localResult) {
        return localResult;
      }

      // If all fails, return a basic result
      return {
        word: text,
        translation: '翻译失败',
        source: 'local'
      };
    }
  }

  async getLocalTranslation(word: string): Promise<TranslationResult | null> {
    const cleanWord = word.toLowerCase().trim();
    const entry = this.localDict.get(cleanWord);
    
    if (entry) {
      return {
        word: entry.word,
        translation: entry.translation,
        pronunciation: entry.pronunciation,
        definitions: entry.definitions,
        source: 'local'
      };
    }

    return null;
  }

  async isOnline(): Promise<boolean> {
    try {
      // Try to fetch a simple endpoint to check connectivity
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        timeout: 3000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async translateOnline(text: string, from: string, to: string): Promise<TranslationResult> {
    // For demo purposes, we'll simulate an API call
    // In a real implementation, you would integrate with actual translation APIs
    
    const isOnline = await this.isOnline();
    if (!isOnline) {
      throw new Error('No internet connection');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock translation based on common patterns
    const mockTranslation = this.getMockTranslation(text, from, to);
    
    return {
      word: text,
      translation: mockTranslation.translation,
      pronunciation: mockTranslation.pronunciation,
      examples: mockTranslation.examples,
      definitions: mockTranslation.definitions,
      source: 'online'
    };
  }

  private getMockTranslation(text: string, from: string, to: string): Partial<TranslationResult> {
    const cleanText = text.toLowerCase().trim();
    
    // Common English to Chinese translations
    const commonTranslations: Record<string, any> = {
      'hello': {
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        definitions: ['感叹词：用于问候', '名词：问候语'],
        examples: ['Hello, how are you?', 'Say hello to your friends.']
      },
      'world': {
        translation: '世界',
        pronunciation: 'wɜːld',
        definitions: ['名词：地球，世界', '名词：领域，界'],
        examples: ['The world is beautiful.', 'Welcome to the world of programming.']
      },
      'book': {
        translation: '书，书籍',
        pronunciation: 'bʊk',
        definitions: ['名词：书本', '动词：预订'],
        examples: ['I love reading books.', 'Book a table for dinner.']
      },
      'read': {
        translation: '阅读，读',
        pronunciation: 'riːd',
        definitions: ['动词：阅读', '动词：理解'],
        examples: ['I read books every day.', 'Can you read this text?']
      },
      'translation': {
        translation: '翻译',
        pronunciation: 'træns\'leɪʃn',
        definitions: ['名词：翻译，译文', '名词：转换'],
        examples: ['This is a good translation.', 'Translation is an art.']
      }
    };

    // Check if we have a predefined translation
    if (commonTranslations[cleanText]) {
      return commonTranslations[cleanText];
    }

    // For Chinese text, provide English translation
    if (/[\u4e00-\u9fff]/.test(text)) {
      const chineseTranslations: Record<string, any> = {
        '你好': {
          translation: 'hello',
          pronunciation: 'nǐ hǎo',
          definitions: ['感叹词：问候语'],
          examples: ['你好，很高兴见到你。']
        },
        '世界': {
          translation: 'world',
          pronunciation: 'shì jiè',
          definitions: ['名词：地球，世界'],
          examples: ['这个世界很美丽。']
        },
        '书': {
          translation: 'book',
          pronunciation: 'shū',
          definitions: ['名词：书籍'],
          examples: ['我喜欢读书。']
        }
      };

      if (chineseTranslations[text]) {
        return chineseTranslations[text];
      }
    }

    // Default fallback translation
    if (/[\u4e00-\u9fff]/.test(text)) {
      return {
        translation: '[Chinese text]',
        definitions: ['中文文本']
      };
    } else {
      return {
        translation: '[英文文本]',
        definitions: ['English text']
      };
    }
  }

  private getCachedTranslation(key: string): TranslationResult | null {
    const cached = this.cache.get(key);
    const timestamp = this.cacheTimestamps.get(key);
    
    if (cached && timestamp && Date.now() - timestamp < this.CACHE_EXPIRY) {
      return cached;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    }

    return null;
  }

  private cacheTranslation(key: string, result: TranslationResult): void {
    this.cache.set(key, result);
    this.cacheTimestamps.set(key, Date.now());
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
  }

  private initializeLocalDict(): void {
    // Initialize with some common words for offline use
    const commonWords: LocalDictEntry[] = [
      {
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        definitions: ['感叹词：用于问候']
      },
      {
        word: 'world',
        translation: '世界',
        pronunciation: 'wɜːld',
        definitions: ['名词：地球，世界']
      },
      {
        word: 'book',
        translation: '书，书籍',
        pronunciation: 'bʊk',
        definitions: ['名词：书本']
      },
      {
        word: 'read',
        translation: '阅读，读',
        pronunciation: 'riːd',
        definitions: ['动词：阅读']
      },
      {
        word: 'text',
        translation: '文本，文字',
        pronunciation: 'tekst',
        definitions: ['名词：文本']
      },
      {
        word: 'word',
        translation: '单词，词语',
        pronunciation: 'wɜːd',
        definitions: ['名词：单词']
      },
      {
        word: 'language',
        translation: '语言',
        pronunciation: '\'læŋɡwɪdʒ',
        definitions: ['名词：语言']
      },
      {
        word: 'translate',
        translation: '翻译',
        pronunciation: 'træns\'leɪt',
        definitions: ['动词：翻译']
      },
      {
        word: 'dictionary',
        translation: '字典，词典',
        pronunciation: '\'dɪkʃəneri',
        definitions: ['名词：字典']
      },
      {
        word: 'meaning',
        translation: '意思，含义',
        pronunciation: '\'miːnɪŋ',
        definitions: ['名词：意思，含义']
      }
    ];

    commonWords.forEach(entry => {
      this.localDict.set(entry.word.toLowerCase(), entry);
    });
  }

  // Method to add words to local dictionary (for future expansion)
  addToLocalDict(word: string, translation: string, pronunciation?: string, definitions?: string[]): void {
    this.localDict.set(word.toLowerCase(), {
      word,
      translation,
      pronunciation,
      definitions
    });
  }

  // Method to clear cache
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  // Method to get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}