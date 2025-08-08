// Tests for custom hooks

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppProvider } from '../context';
import { 
  useBooks, 
  useVocabulary, 
  useCurrentView, 
  useTheme, 
  useLoading, 
  useError,
  useAppSettings
} from '../hooks';
import { BookMetadata, VocabularyItem, ErrorType } from '../../../shared/types';

// Test wrapper component
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );
};

describe('useBooks', () => {
  it('should manage books state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBooks(), { wrapper });

    expect(result.current.books).toEqual([]);
    expect(result.current.currentBook).toBeNull();

    const mockBook: BookMetadata = {
      id: '1',
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      filePath: '/test/path',
      fileSize: 1024,
      importDate: new Date(),
      totalPages: 100,
      language: 'zh-CN'
    };

    act(() => {
      result.current.addBook(mockBook);
    });

    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0]).toEqual(mockBook);
  });

  it('should open and close books', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBooks(), { wrapper });

    const mockBook: BookMetadata = {
      id: '1',
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      filePath: '/test/path',
      fileSize: 1024,
      importDate: new Date(),
      totalPages: 100,
      language: 'zh-CN'
    };

    act(() => {
      result.current.addBook(mockBook);
    });

    act(() => {
      result.current.openBook(mockBook);
    });

    // The openBook action updates lastReadDate, so we need to check for that
    expect(result.current.currentBook).toMatchObject({
      ...mockBook,
      lastReadDate: expect.any(Date)
    });

    act(() => {
      result.current.closeBook();
    });

    expect(result.current.currentBook).toBeNull();
  });

  it('should update and delete books', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBooks(), { wrapper });

    const mockBook: BookMetadata = {
      id: '1',
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      filePath: '/test/path',
      fileSize: 1024,
      importDate: new Date(),
      totalPages: 100,
      language: 'zh-CN'
    };

    act(() => {
      result.current.addBook(mockBook);
    });

    act(() => {
      result.current.updateBook('1', { title: 'Updated Title' });
    });

    expect(result.current.books[0].title).toBe('Updated Title');

    act(() => {
      result.current.deleteBook('1');
    });

    expect(result.current.books).toHaveLength(0);
  });
});

describe('useVocabulary', () => {
  it('should manage vocabulary state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useVocabulary(), { wrapper });

    expect(result.current.vocabulary).toEqual([]);

    const mockVocabulary: VocabularyItem = {
      id: 'vocab1',
      word: 'test',
      translation: '测试',
      bookId: '1',
      context: 'test context',
      addedDate: new Date(),
      mastered: false
    };

    act(() => {
      result.current.addVocabularyItem(mockVocabulary);
    });

    expect(result.current.vocabulary).toHaveLength(1);
    expect(result.current.vocabulary[0]).toEqual(mockVocabulary);
  });

  it('should mark vocabulary as mastered', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useVocabulary(), { wrapper });

    const mockVocabulary: VocabularyItem = {
      id: 'vocab1',
      word: 'test',
      translation: '测试',
      bookId: '1',
      context: 'test context',
      addedDate: new Date(),
      mastered: false
    };

    act(() => {
      result.current.addVocabularyItem(mockVocabulary);
    });

    act(() => {
      result.current.markAsMastered('vocab1', true);
    });

    expect(result.current.vocabulary[0].mastered).toBe(true);
  });

  it('should provide vocabulary statistics', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useVocabulary(), { wrapper });

    const mockVocabulary: VocabularyItem[] = [
      {
        id: 'vocab1',
        word: 'test1',
        translation: '测试1',
        bookId: '1',
        context: 'context1',
        addedDate: new Date(),
        mastered: false
      },
      {
        id: 'vocab2',
        word: 'test2',
        translation: '测试2',
        bookId: '1',
        context: 'context2',
        addedDate: new Date(),
        mastered: true
      }
    ];

    act(() => {
      result.current.setVocabulary(mockVocabulary);
    });

    expect(result.current.vocabularyStats.total).toBe(2);
    expect(result.current.vocabularyStats.mastered).toBe(1);
    expect(result.current.vocabularyStats.unmastered).toBe(1);
    expect(result.current.unmasteredVocabulary).toHaveLength(1);
  });
});

describe('useCurrentView', () => {
  it('should manage current view state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCurrentView(), { wrapper });

    expect(result.current.currentView).toBe('bookshelf');

    act(() => {
      result.current.setCurrentView('reader');
    });

    expect(result.current.currentView).toBe('reader');
  });
});

describe('useTheme', () => {
  it('should manage theme state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => {
      const theme = useTheme();
      const settings = useAppSettings();
      return { ...theme, ...settings };
    }, { wrapper });

    // Initial theme should be light (from mock)
    expect(result.current.theme).toBe('light');

    // First update settings to not use system theme, then set theme
    act(() => {
      result.current.updateAppSettings({ theme: 'dark' });
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');

    // Test setting light theme
    act(() => {
      result.current.updateAppSettings({ theme: 'light' });
    });

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
  });
});

describe('useLoading', () => {
  it('should manage loading state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLoading(), { wrapper });

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);
  });
});

describe('useError', () => {
  it('should manage error state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useError(), { wrapper });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);

    act(() => {
      result.current.createError(ErrorType.PARSE_ERROR, 'Test error');
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.hasError).toBe(true);
    expect(result.current.error?.message).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });
});

describe('useAppSettings', () => {
  it('should manage app settings', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppSettings(), { wrapper });

    expect(result.current.settings.theme).toBe('system');
    expect(result.current.settings.language).toBe('zh-CN');

    act(() => {
      result.current.updateAppSettings({ 
        theme: 'dark',
        language: 'en-US'
      });
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.language).toBe('en-US');
  });
});