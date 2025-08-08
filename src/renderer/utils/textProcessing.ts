/**
 * Text processing utilities for word selection and translation
 */

export interface WordInfo {
  word: string;
  cleanWord: string;
  language: 'zh' | 'en' | 'mixed' | 'unknown';
  isValid: boolean;
}

/**
 * Detect the primary language of a text string
 */
export const detectLanguage = (text: string): 'zh' | 'en' | 'mixed' | 'unknown' => {
  if (!text.trim()) return 'unknown';

  const chineseRegex = /[\u4e00-\u9fff]/g;
  const englishRegex = /[a-zA-Z]/g;
  
  const chineseMatches = text.match(chineseRegex) || [];
  const englishMatches = text.match(englishRegex) || [];
  
  const chineseCount = chineseMatches.length;
  const englishCount = englishMatches.length;
  const totalChars = text.replace(/\s/g, '').length;
  
  if (totalChars === 0) return 'unknown';
  
  const chineseRatio = chineseCount / totalChars;
  const englishRatio = englishCount / totalChars;
  
  if (chineseRatio > 0.1 && englishRatio > 0.1) return 'mixed';
  if (chineseRatio > 0.5) return 'zh';
  if (englishRatio > 0.5) return 'en';
  
  return 'unknown';
};

/**
 * Clean and normalize selected text for translation
 */
export const cleanSelectedText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[""'']/g, '"') // Normalize quotes
    .replace(/[—–]/g, '-') // Normalize dashes
    .replace(/…/g, '...'); // Normalize ellipsis
};

/**
 * Extract the main word from selected text
 */
export const extractMainWord = (text: string): string => {
  const cleaned = cleanSelectedText(text);
  const language = detectLanguage(cleaned);
  
  if (language === 'zh') {
    // For Chinese, return the cleaned text as is (could be a phrase)
    return cleaned;
  } else if (language === 'en') {
    // For English, extract the first complete word
    const words = cleaned.split(/\s+/);
    const firstWord = words[0];
    
    // Remove punctuation from the beginning and end
    return firstWord.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase();
  } else if (language === 'mixed') {
    // For mixed content, return the cleaned text as is
    return cleaned;
  } else {
    // For unknown, return cleaned text
    return cleaned;
  }
};

/**
 * Validate if the selected text is suitable for translation
 */
export const isValidForTranslation = (text: string): boolean => {
  const cleaned = cleanSelectedText(text);
  
  // Check minimum and maximum length
  if (cleaned.length < 1 || cleaned.length > 200) {
    return false;
  }
  
  // Check if it's mostly punctuation or numbers
  const alphanumericRegex = /[\w\u4e00-\u9fff]/g;
  const alphanumericMatches = cleaned.match(alphanumericRegex) || [];
  const nonSpaceLength = cleaned.replace(/\s/g, '').length;
  
  if (nonSpaceLength === 0) return false;
  
  const alphanumericRatio = alphanumericMatches.length / nonSpaceLength;
  
  if (alphanumericRatio < 0.5) {
    return false;
  }
  
  // Check if it's a valid word or phrase
  const language = detectLanguage(cleaned);
  
  if (language === 'en') {
    // For English, check if it contains at least one letter
    return /[a-zA-Z]/.test(cleaned);
  } else if (language === 'zh') {
    // For Chinese, check if it contains at least one Chinese character
    return /[\u4e00-\u9fff]/.test(cleaned);
  } else if (language === 'mixed') {
    // For mixed content, allow if it has both languages
    return /[a-zA-Z]/.test(cleaned) && /[\u4e00-\u9fff]/.test(cleaned);
  }
  
  return false;
};

/**
 * Analyze selected text and return word information
 */
export const analyzeSelectedText = (text: string): WordInfo => {
  const cleanWord = cleanSelectedText(text);
  const mainWord = extractMainWord(text);
  const language = detectLanguage(cleanWord);
  const isValid = isValidForTranslation(cleanWord);
  
  return {
    word: text,
    cleanWord,
    language,
    isValid
  };
};

/**
 * Split text into sentences for context extraction
 */
export const splitIntoSentences = (text: string): string[] => {
  // Handle both Chinese and English sentence endings
  const sentenceRegex = /[.!?。！？]+/g;
  return text.split(sentenceRegex)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
};

/**
 * Find the sentence containing the selected text
 */
export const findContainingSentence = (fullText: string, selectedText: string): string => {
  const sentences = splitIntoSentences(fullText);
  const cleanSelected = cleanSelectedText(selectedText);
  
  for (const sentence of sentences) {
    if (sentence.includes(cleanSelected) || sentence.includes(selectedText)) {
      return sentence;
    }
  }
  
  // If no sentence found, try to find the sentence with punctuation
  const sentenceWithPunctuation = fullText.match(/[^.!?。！？]*[.!?。！？]/g);
  if (sentenceWithPunctuation) {
    for (const sentence of sentenceWithPunctuation) {
      if (sentence.includes(cleanSelected) || sentence.includes(selectedText)) {
        return sentence.trim();
      }
    }
  }
  
  // If no sentence found, return a portion around the selected text
  const index = fullText.indexOf(selectedText);
  if (index !== -1) {
    const start = Math.max(0, index - 50);
    const end = Math.min(fullText.length, index + selectedText.length + 50);
    return fullText.substring(start, end).trim();
  }
  
  return selectedText;
};

/**
 * Generate a unique ID for a word based on its content and context
 */
export const generateWordId = (word: string, context: string, bookId: string): string => {
  const cleanWord = cleanSelectedText(word);
  const contextHash = context.substring(0, 20); // First 20 chars of context
  const timestamp = Date.now();
  
  return `${bookId}-${cleanWord.replace(/\s+/g, '_')}-${contextHash.replace(/\s+/g, '_')}-${timestamp}`;
};

/**
 * Check if two words are similar (for duplicate detection)
 */
export const areWordsSimilar = (word1: string, word2: string): boolean => {
  const clean1 = cleanSelectedText(word1).toLowerCase();
  const clean2 = cleanSelectedText(word2).toLowerCase();
  
  // Exact match
  if (clean1 === clean2) return true;
  
  // Check if one is contained in the other (for phrases)
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    const longer = clean1.length > clean2.length ? clean1 : clean2;
    const shorter = clean1.length > clean2.length ? clean2 : clean1;
    
    // If the shorter word is more than 50% of the longer word, consider them similar
    return shorter.length / longer.length > 0.5;
  }
  
  return false;
};