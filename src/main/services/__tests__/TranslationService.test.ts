import { TranslationServiceImpl } from '../TranslationService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('TranslationService', () => {
  let translationService: TranslationServiceImpl;

  beforeEach(() => {
    translationService = new TranslationServiceImpl();
    jest.clearAllMocks();
  });

  describe('translate', () => {
    it('should return online translation when online', async () => {
      // Mock successful network check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await translationService.translate('hello', 'en', 'zh-CN');

      expect(result).toEqual({
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        examples: ['Hello, how are you?', 'Say hello to your friends.'],
        definitions: ['感叹词：用于问候', '名词：问候语'],
        source: 'online'
      });
    });

    it('should fallback to local translation when offline', async () => {
      // Mock failed network check
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await translationService.translate('hello', 'en', 'zh-CN');

      expect(result).toEqual({
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        definitions: ['感叹词：用于问候'],
        source: 'local'
      });
    });

    it('should return fallback translation for unknown words', async () => {
      // Mock failed network check
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await translationService.translate('unknownword', 'en', 'zh-CN');

      expect(result).toEqual({
        word: 'unknownword',
        translation: '翻译失败',
        source: 'local'
      });
    });

    it('should handle Chinese to English translation', async () => {
      // Mock successful network check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await translationService.translate('你好', 'zh-CN', 'en');

      expect(result).toEqual({
        word: '你好',
        translation: 'hello',
        pronunciation: 'nǐ hǎo',
        definitions: ['感叹词：问候语'],
        examples: ['你好，很高兴见到你。'],
        source: 'online'
      });
    });

    it('should cache translation results', async () => {
      // Mock successful network check
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      // First call
      const result1 = await translationService.translate('hello', 'en', 'zh-CN');
      
      // Second call should use cache (no additional network call)
      const result2 = await translationService.translate('hello', 'en', 'zh-CN');

      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Only for network checks
    });
  });

  describe('getLocalTranslation', () => {
    it('should return local translation for known words', async () => {
      const result = await translationService.getLocalTranslation('hello');

      expect(result).toEqual({
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        definitions: ['感叹词：用于问候'],
        source: 'local'
      });
    });

    it('should return null for unknown words', async () => {
      const result = await translationService.getLocalTranslation('unknownword');

      expect(result).toBeNull();
    });

    it('should be case insensitive', async () => {
      const result = await translationService.getLocalTranslation('HELLO');

      expect(result).toEqual({
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        definitions: ['感叹词：用于问候'],
        source: 'local'
      });
    });
  });

  describe('isOnline', () => {
    it('should return true when online', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await translationService.isOnline();

      expect(result).toBe(true);
    });

    it('should return false when offline', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await translationService.isOnline();

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      // Mock successful network check
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      // Add something to cache
      await translationService.translate('hello', 'en', 'zh-CN');
      
      // Clear cache
      translationService.clearCache();
      
      // Next call should make network request again
      await translationService.translate('hello', 'en', 'zh-CN');

      expect(global.fetch).toHaveBeenCalledTimes(4); // 2 network checks + 2 more after cache clear
    });

    it('should provide cache statistics', () => {
      const stats = translationService.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('local dictionary management', () => {
    it('should allow adding words to local dictionary', async () => {
      translationService.addToLocalDict('test', '测试', 'test', ['名词：测试']);

      const result = await translationService.getLocalTranslation('test');

      expect(result).toEqual({
        word: 'test',
        translation: '测试',
        pronunciation: 'test',
        definitions: ['名词：测试'],
        source: 'local'
      });
    });

    it('should handle words with special characters', async () => {
      translationService.addToLocalDict('hello-world', '你好世界');

      const result = await translationService.getLocalTranslation('hello-world');

      expect(result).toEqual({
        word: 'hello-world',
        translation: '你好世界',
        source: 'local'
      });
    });
  });
});