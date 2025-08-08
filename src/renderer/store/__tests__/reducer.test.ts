// Tests for the application reducer

import { appReducer, initialState, selectors } from '../reducer';
import { ActionType } from '../types';
import { BookMetadata, VocabularyItem, AppSettings, ErrorType } from '../../../shared/types';
import { createAppError } from '../actions';

describe('appReducer', () => {
  describe('loading actions', () => {
    it('should set loading state', () => {
      const action = { type: ActionType.SET_LOADING, payload: true };
      const newState = appReducer(initialState, action);
      
      expect(newState.loading).toBe(true);
      expect(newState).not.toBe(initialState); // immutability check
    });
  });

  describe('error actions', () => {
    it('should set error and clear loading', () => {
      const error = createAppError(ErrorType.PARSE_ERROR, 'Test error');
      const action = { type: ActionType.SET_ERROR, payload: error };
      const stateWithLoading = { ...initialState, loading: true };
      
      const newState = appReducer(stateWithLoading, action);
      
      expect(newState.error).toEqual(error);
      expect(newState.loading).toBe(false);
    });

    it('should clear error', () => {
      const error = createAppError(ErrorType.PARSE_ERROR, 'Test error');
      const stateWithError = { ...initialState, error };
      const action = { type: ActionType.CLEAR_ERROR };
      
      const newState = appReducer(stateWithError, action);
      
      expect(newState.error).toBeNull();
    });
  });

  describe('view actions', () => {
    it('should set current view', () => {
      const action = { type: ActionType.SET_CURRENT_VIEW, payload: 'reader' as const };
      const newState = appReducer(initialState, action);
      
      expect(newState.currentView).toBe('reader');
    });

    it('should set theme', () => {
      const action = { type: ActionType.SET_THEME, payload: 'dark' as const };
      const newState = appReducer(initialState, action);
      
      expect(newState.theme).toBe('dark');
    });
  });

  describe('books actions', () => {
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

    it('should set books', () => {
      const books = [mockBook];
      const action = { type: ActionType.SET_BOOKS, payload: books };
      const newState = appReducer(initialState, action);
      
      expect(newState.books).toEqual(books);
    });

    it('should add book', () => {
      const action = { type: ActionType.ADD_BOOK, payload: mockBook };
      const newState = appReducer(initialState, action);
      
      expect(newState.books).toHaveLength(1);
      expect(newState.books[0]).toEqual(mockBook);
    });

    it('should update book', () => {
      const stateWithBook = { ...initialState, books: [mockBook] };
      const updates = { title: 'Updated Title' };
      const action = { 
        type: ActionType.UPDATE_BOOK, 
        payload: { bookId: '1', updates } 
      };
      
      const newState = appReducer(stateWithBook, action);
      
      expect(newState.books[0].title).toBe('Updated Title');
      expect(newState.books[0].author).toBe('Test Author'); // unchanged
    });

    it('should delete book and related data', () => {
      const mockVocabulary: VocabularyItem = {
        id: 'vocab1',
        word: 'test',
        translation: '测试',
        bookId: '1',
        context: 'test context',
        addedDate: new Date(),
        mastered: false
      };

      const stateWithData = {
        ...initialState,
        books: [mockBook],
        currentBook: mockBook,
        vocabulary: [mockVocabulary]
      };

      const action = { type: ActionType.DELETE_BOOK, payload: '1' };
      const newState = appReducer(stateWithData, action);
      
      expect(newState.books).toHaveLength(0);
      expect(newState.currentBook).toBeNull();
      expect(newState.vocabulary).toHaveLength(0);
    });

    it('should set current book', () => {
      const action = { type: ActionType.SET_CURRENT_BOOK, payload: mockBook };
      const newState = appReducer(initialState, action);
      
      expect(newState.currentBook).toEqual(mockBook);
    });
  });

  describe('vocabulary actions', () => {
    const mockVocabulary: VocabularyItem = {
      id: 'vocab1',
      word: 'test',
      translation: '测试',
      bookId: '1',
      context: 'test context',
      addedDate: new Date(),
      mastered: false
    };

    it('should add vocabulary item', () => {
      const action = { type: ActionType.ADD_VOCABULARY_ITEM, payload: mockVocabulary };
      const newState = appReducer(initialState, action);
      
      expect(newState.vocabulary).toHaveLength(1);
      expect(newState.vocabulary[0]).toEqual(mockVocabulary);
    });

    it('should update vocabulary item', () => {
      const stateWithVocab = { ...initialState, vocabulary: [mockVocabulary] };
      const updates = { mastered: true };
      const action = { 
        type: ActionType.UPDATE_VOCABULARY_ITEM, 
        payload: { wordId: 'vocab1', updates } 
      };
      
      const newState = appReducer(stateWithVocab, action);
      
      expect(newState.vocabulary[0].mastered).toBe(true);
      expect(newState.vocabulary[0].word).toBe('test'); // unchanged
    });

    it('should delete vocabulary item', () => {
      const stateWithVocab = { ...initialState, vocabulary: [mockVocabulary] };
      const action = { type: ActionType.DELETE_VOCABULARY_ITEM, payload: 'vocab1' };
      
      const newState = appReducer(stateWithVocab, action);
      
      expect(newState.vocabulary).toHaveLength(0);
    });
  });

  describe('settings actions', () => {
    const mockSettings: AppSettings = {
      theme: 'dark',
      language: 'en-US',
      autoSave: false,
      cacheSize: 1000
    };

    it('should set app settings', () => {
      const action = { type: ActionType.SET_APP_SETTINGS, payload: mockSettings };
      const newState = appReducer(initialState, action);
      
      expect(newState.settings).toEqual(mockSettings);
    });

    it('should update app settings', () => {
      const updates = { theme: 'dark' as const };
      const action = { type: ActionType.UPDATE_APP_SETTINGS, payload: updates };
      
      const newState = appReducer(initialState, action);
      
      expect(newState.settings.theme).toBe('dark');
      expect(newState.settings.language).toBe('zh-CN'); // unchanged
    });
  });

  describe('batch operations', () => {
    it('should reset state', () => {
      const modifiedState = {
        ...initialState,
        currentView: 'reader' as const,
        loading: true,
        books: [{ id: '1' } as BookMetadata]
      };

      const action = { type: ActionType.RESET_STATE };
      const newState = appReducer(modifiedState, action);
      
      expect(newState).toEqual(initialState);
    });

    it('should hydrate state', () => {
      const partialState = {
        currentView: 'vocabulary' as const,
        theme: 'dark' as const
      };

      const action = { type: ActionType.HYDRATE_STATE, payload: partialState };
      const newState = appReducer(initialState, action);
      
      expect(newState.currentView).toBe('vocabulary');
      expect(newState.theme).toBe('dark');
      expect(newState.books).toEqual([]); // unchanged
    });
  });
});

describe('selectors', () => {
  const mockBook: BookMetadata = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    format: 'epub',
    filePath: '/test/path',
    fileSize: 1024,
    importDate: new Date(),
    lastReadDate: new Date(),
    totalPages: 100,
    language: 'zh-CN'
  };

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

  const testState = {
    ...initialState,
    books: [mockBook],
    vocabulary: mockVocabulary,
    currentBook: mockBook
  };

  it('should select books correctly', () => {
    expect(selectors.getBooks(testState)).toEqual([mockBook]);
    expect(selectors.getCurrentBook(testState)).toEqual(mockBook);
    expect(selectors.getBookById(testState, '1')).toEqual(mockBook);
    expect(selectors.getBookById(testState, '999')).toBeNull();
  });

  it('should select vocabulary correctly', () => {
    expect(selectors.getVocabulary(testState)).toEqual(mockVocabulary);
    expect(selectors.getVocabularyByBook(testState, '1')).toEqual(mockVocabulary);
    expect(selectors.getUnmasteredVocabulary(testState)).toHaveLength(1);
    
    const stats = selectors.getVocabularyStats(testState);
    expect(stats.total).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.unmastered).toBe(1);
  });

  it('should select UI state correctly', () => {
    expect(selectors.getCurrentView(testState)).toBe('bookshelf');
    expect(selectors.getTheme(testState)).toBe('light');
    expect(selectors.isLoading(testState)).toBe(false);
    expect(selectors.hasError(testState)).toBe(false);
  });
});