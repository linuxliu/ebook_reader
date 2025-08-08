import { TranslationClient } from '../TranslationClient';
import { IPCClient } from '../IPCClient';

// Mock IPCClient
jest.mock('../IPCClient');

describe('TranslationClient', () => {
  let translationClient: TranslationClient;
  let mockIPCClient: jest.Mocked<IPCClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock IPC client
    mockIPCClient = {
      invoke: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    } as any;
    
    translationClient = new TranslationClient();
    (translationClient as any).ipcClient = mockIPCClient;
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockResult = {
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        source: 'online' as const
      };

      mockIPCClient.invoke.mockResolvedValueOnce(mockResult);

      const result = await translationClient.translate('hello');

      expect(mockIPCClient.invoke).toHaveBeenCalledWith('translation:translate', {
        text: 'hello',
        from: 'auto',
        to: 'zh-CN'
      });
      expect(result).toEqual(mockResult);
    });

    it('should use cached results', async () => {
      const mockResult = {
        word: 'hello',
        translation: '你好',
        source: 'online' as const
      };

      mockIPCClient.invoke.mockResolvedValueOnce(mockResult);

      // First call
      const result1 = await translationClient.translate('hello');
      
      // Second call should use cache
      const result2 = await translationClient.translate('hello');

      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should fallback to local translation on error', async () => {
      const mockLocalResult = {
        word: 'hello',
        translation: '你好',
        source: 'local' as const
      };

      mockIPCClient.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLocalResult);

      const result = await translationClient.translate('hello');

      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(2);
      expect(mockIPCClient.invoke).toHaveBeenNthCalledWith(1, 'translation:translate', {
        text: 'hello',
        from: 'auto',
        to: 'zh-CN'
      });
      expect(mockIPCClient.invoke).toHaveBeenNthCalledWith(2, 'translation:get-local', {
        word: 'hello'
      });
      expect(result).toEqual(mockLocalResult);
    });

    it('should return fallback result when all methods fail', async () => {
      mockIPCClient.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Local error'));

      const result = await translationClient.translate('hello');

      expect(result).toEqual({
        word: 'hello',
        translation: '翻译失败',
        source: 'local'
      });
    });
  });

  describe('getLocalTranslation', () => {
    it('should get local translation successfully', async () => {
      const mockResult = {
        word: 'hello',
        translation: '你好',
        source: 'local' as const
      };

      mockIPCClient.invoke.mockResolvedValueOnce(mockResult);

      const result = await translationClient.getLocalTranslation('hello');

      expect(mockIPCClient.invoke).toHaveBeenCalledWith('translation:get-local', {
        word: 'hello'
      });
      expect(result).toEqual(mockResult);
    });

    it('should return null on error', async () => {
      mockIPCClient.invoke.mockRejectedValueOnce(new Error('Error'));

      const result = await translationClient.getLocalTranslation('hello');

      expect(result).toBeNull();
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple words', async () => {
      const mockResults = [
        { word: 'hello', translation: '你好', source: 'online' as const },
        { word: 'world', translation: '世界', source: 'online' as const }
      ];

      mockIPCClient.invoke
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const results = await translationClient.translateBatch(['hello', 'world']);

      expect(results).toEqual(mockResults);
      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasLocalTranslation', () => {
    it('should return true when local translation exists', async () => {
      mockIPCClient.invoke.mockResolvedValueOnce({
        word: 'hello',
        translation: '你好',
        source: 'local' as const
      });

      const result = await translationClient.hasLocalTranslation('hello');

      expect(result).toBe(true);
    });

    it('should return false when local translation does not exist', async () => {
      mockIPCClient.invoke.mockResolvedValueOnce(null);

      const result = await translationClient.hasLocalTranslation('unknown');

      expect(result).toBe(false);
    });
  });

  describe('translateWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResult = {
        word: 'hello',
        translation: '你好',
        source: 'online' as const
      };

      mockIPCClient.invoke.mockResolvedValueOnce(mockResult);

      const result = await translationClient.translateWithRetry('hello');

      expect(result).toEqual(mockResult);
      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockResult = {
        word: 'hello',
        translation: '你好',
        source: 'online' as const
      };

      mockIPCClient.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResult);

      const result = await translationClient.translateWithRetry('hello', 'auto', 'zh-CN', 3);

      expect(result).toEqual(mockResult);
      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(3);
    });

    it('should return fallback after max retries', async () => {
      mockIPCClient.invoke.mockRejectedValue(new Error('Network error'));

      const result = await translationClient.translateWithRetry('hello', 'auto', 'zh-CN', 2);

      expect(result).toEqual({
        word: 'hello',
        translation: '翻译失败',
        source: 'local'
      });
      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('needsTranslation', () => {
    it('should return true for English text when user language is Chinese', () => {
      expect(translationClient.needsTranslation('hello world', 'zh-CN')).toBe(true);
    });

    it('should return false for Chinese text when user language is Chinese', () => {
      expect(translationClient.needsTranslation('你好世界', 'zh-CN')).toBe(false);
    });

    it('should return true for Chinese text when user language is English', () => {
      expect(translationClient.needsTranslation('你好世界', 'en')).toBe(true);
    });

    it('should return false for empty text', () => {
      expect(translationClient.needsTranslation('', 'zh-CN')).toBe(false);
    });

    it('should return false for very long text', () => {
      const longText = 'a'.repeat(101);
      expect(translationClient.needsTranslation(longText, 'zh-CN')).toBe(false);
    });
  });

  describe('getSuggestedDirection', () => {
    it('should suggest Chinese to English for Chinese text', () => {
      const result = translationClient.getSuggestedDirection('你好世界');
      expect(result).toEqual({ from: 'zh-CN', to: 'en' });
    });

    it('should suggest English to Chinese for English text', () => {
      const result = translationClient.getSuggestedDirection('hello world');
      expect(result).toEqual({ from: 'en', to: 'zh-CN' });
    });

    it('should suggest auto detection for mixed text', () => {
      const result = translationClient.getSuggestedDirection('hello 世界');
      expect(result).toEqual({ from: 'auto', to: 'zh-CN' });
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      translationClient.clearCache();
      const stats = translationClient.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = translationClient.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('preloadCommonWords', () => {
    it('should preload words in batches', async () => {
      const mockResult = {
        word: 'test',
        translation: '测试',
        source: 'online' as const
      };

      mockIPCClient.invoke.mockResolvedValue(mockResult);

      await translationClient.preloadCommonWords(['hello', 'world', 'test']);

      expect(mockIPCClient.invoke).toHaveBeenCalledTimes(3);
    });
  });
});