import {
  detectLanguage,
  cleanSelectedText,
  extractMainWord,
  isValidForTranslation,
  analyzeSelectedText,
  splitIntoSentences,
  findContainingSentence,
  generateWordId,
  areWordsSimilar,
} from '../textProcessing';

describe('textProcessing utilities', () => {
  describe('detectLanguage', () => {
    it('should detect Chinese text', () => {
      expect(detectLanguage('这是中文文本')).toBe('zh');
      expect(detectLanguage('你好世界')).toBe('zh');
    });

    it('should detect English text', () => {
      expect(detectLanguage('This is English text')).toBe('en');
      expect(detectLanguage('Hello world')).toBe('en');
    });

    it('should detect mixed language text', () => {
      expect(detectLanguage('This is 中文 mixed text')).toBe('mixed');
      expect(detectLanguage('Hello 世界')).toBe('mixed');
    });

    it('should handle empty or unknown text', () => {
      expect(detectLanguage('')).toBe('unknown');
      expect(detectLanguage('   ')).toBe('unknown');
      expect(detectLanguage('123456')).toBe('unknown');
      expect(detectLanguage('!@#$%^')).toBe('unknown');
    });
  });

  describe('cleanSelectedText', () => {
    it('should normalize whitespace', () => {
      expect(cleanSelectedText('  hello   world  ')).toBe('hello world');
      expect(cleanSelectedText('text\n\nwith\tspaces')).toBe('text with spaces');
    });

    it('should normalize quotes and punctuation', () => {
      expect(cleanSelectedText('"hello"')).toBe('"hello"');
      expect(cleanSelectedText("'world'")).toBe('"world"');
      expect(cleanSelectedText('text—with—dashes')).toBe('text-with-dashes');
      expect(cleanSelectedText('text…')).toBe('text...');
    });
  });

  describe('extractMainWord', () => {
    it('should extract English words', () => {
      expect(extractMainWord('Hello')).toBe('hello');
      expect(extractMainWord('Hello world')).toBe('hello');
      expect(extractMainWord('  WORD  ')).toBe('word');
      expect(extractMainWord('word!')).toBe('word');
    });

    it('should handle Chinese text', () => {
      expect(extractMainWord('你好')).toBe('你好');
      expect(extractMainWord('这是一个词')).toBe('这是一个词');
    });

    it('should handle mixed content', () => {
      expect(extractMainWord('Hello 世界')).toBe('Hello 世界');
    });
  });

  describe('isValidForTranslation', () => {
    it('should validate English words', () => {
      expect(isValidForTranslation('hello')).toBe(true);
      expect(isValidForTranslation('Hello World')).toBe(true);
      expect(isValidForTranslation('word123')).toBe(true);
    });

    it('should validate Chinese text', () => {
      expect(isValidForTranslation('你好')).toBe(true);
      expect(isValidForTranslation('这是中文')).toBe(true);
    });

    it('should reject invalid text', () => {
      expect(isValidForTranslation('')).toBe(false);
      expect(isValidForTranslation('   ')).toBe(false);
      expect(isValidForTranslation('!@#$%')).toBe(false);
      expect(isValidForTranslation('123456')).toBe(false);
    });

    it('should reject text that is too long', () => {
      const longText = 'a'.repeat(201);
      expect(isValidForTranslation(longText)).toBe(false);
    });

    it('should handle mixed content', () => {
      expect(isValidForTranslation('Hello 世界')).toBe(true);
    });
  });

  describe('analyzeSelectedText', () => {
    it('should analyze English text', () => {
      const result = analyzeSelectedText('  Hello World  ');
      expect(result.word).toBe('  Hello World  ');
      expect(result.cleanWord).toBe('Hello World');
      expect(result.language).toBe('en');
      expect(result.isValid).toBe(true);
    });

    it('should analyze Chinese text', () => {
      const result = analyzeSelectedText('你好世界');
      expect(result.word).toBe('你好世界');
      expect(result.cleanWord).toBe('你好世界');
      expect(result.language).toBe('zh');
      expect(result.isValid).toBe(true);
    });

    it('should analyze invalid text', () => {
      const result = analyzeSelectedText('!@#$');
      expect(result.isValid).toBe(false);
    });
  });

  describe('splitIntoSentences', () => {
    it('should split English sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = splitIntoSentences(text);
      expect(sentences).toEqual(['First sentence', 'Second sentence', 'Third sentence']);
    });

    it('should split Chinese sentences', () => {
      const text = '第一句话。第二句话！第三句话？';
      const sentences = splitIntoSentences(text);
      expect(sentences).toEqual(['第一句话', '第二句话', '第三句话']);
    });

    it('should handle mixed punctuation', () => {
      const text = 'English sentence. 中文句子。Mixed sentence!';
      const sentences = splitIntoSentences(text);
      expect(sentences).toEqual(['English sentence', '中文句子', 'Mixed sentence']);
    });
  });

  describe('findContainingSentence', () => {
    it('should find sentence containing selected text', () => {
      const fullText = 'This is the first sentence. This contains the word hello. This is the last sentence.';
      const selectedText = 'hello';
      const result = findContainingSentence(fullText, selectedText);
      expect(result).toBe('This contains the word hello.');
    });

    it('should handle text not in any sentence', () => {
      const fullText = 'Some text without proper punctuation hello world more text';
      const selectedText = 'hello';
      const result = findContainingSentence(fullText, selectedText);
      expect(result).toContain('hello');
    });

    it('should return selected text if not found', () => {
      const fullText = 'Some text without the target';
      const selectedText = 'missing';
      const result = findContainingSentence(fullText, selectedText);
      expect(result).toBe('missing');
    });
  });

  describe('generateWordId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateWordId('hello', 'context1', 'book1');
      const id2 = generateWordId('hello', 'context2', 'book1');
      const id3 = generateWordId('world', 'context1', 'book1');
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should include book ID in the generated ID', () => {
      const id = generateWordId('hello', 'context', 'book123');
      expect(id).toContain('book123');
    });

    it('should handle special characters in words', () => {
      const id = generateWordId('hello world!', 'some context', 'book1');
      expect(id).toContain('hello_world!');
    });
  });

  describe('areWordsSimilar', () => {
    it('should detect exact matches', () => {
      expect(areWordsSimilar('hello', 'hello')).toBe(true);
      expect(areWordsSimilar('Hello', 'hello')).toBe(true);
      expect(areWordsSimilar('  hello  ', 'hello')).toBe(true);
    });

    it('should detect similar phrases', () => {
      expect(areWordsSimilar('hello world', 'hello')).toBe(true);
      expect(areWordsSimilar('hello', 'hello world')).toBe(true);
    });

    it('should reject dissimilar words', () => {
      expect(areWordsSimilar('hello', 'world')).toBe(false);
      expect(areWordsSimilar('completely', 'different')).toBe(false);
    });

    it('should handle Chinese text', () => {
      expect(areWordsSimilar('你好', '你好')).toBe(true);
      expect(areWordsSimilar('你好世界', '你好')).toBe(true);
      expect(areWordsSimilar('你好', '世界')).toBe(false);
    });

    it('should consider length ratio for similarity', () => {
      expect(areWordsSimilar('hello', 'hello world test')).toBe(false); // ratio too low
      expect(areWordsSimilar('hello world', 'hello world test')).toBe(true); // ratio acceptable
    });
  });
});