// Custom hooks for accessing and manipulating application state

import { useCallback, useMemo } from 'react';
import { useAppContext } from './context';
import { selectors } from './reducer';
import { 
  BookMetadata, 
  ReadingProgress, 
  VocabularyItem, 
  AppSettings, 
  AppError,
  AppState 
} from '../../shared/types';
import {
  setLoading,
  setError,
  clearError,
  setCurrentView,
  setTheme,
  setBooks,
  addBook,
  updateBook,
  deleteBook,
  setCurrentBook,
  setReadingProgress,
  updateReadingProgress,
  setVocabulary,
  addVocabularyItem,
  updateVocabularyItem,
  deleteVocabularyItem,
  setAppSettings,
  updateAppSettings,
  resetState,
  openBook,
  closeBook,
  markVocabularyAsMastered,
  createAppError
} from './actions';

// ============================================================================
// Base Hook
// ============================================================================

export const useAppState = () => {
  const { state, dispatch } = useAppContext();
  return { state, dispatch };
};

// ============================================================================
// UI State Hooks
// ============================================================================

export const useLoading = () => {
  const { state, dispatch } = useAppContext();
  
  const loading = selectors.isLoading(state);
  
  const setLoadingState = useCallback((loading: boolean) => {
    dispatch(setLoading(loading));
  }, [dispatch]);

  return { loading, setLoading: setLoadingState };
};

export const useError = () => {
  const { state, dispatch } = useAppContext();
  
  const error = selectors.getError(state);
  const hasError = selectors.hasError(state);
  
  const setErrorState = useCallback((error: AppError) => {
    dispatch(setError(error));
  }, [dispatch]);

  const clearErrorState = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const createError = useCallback((
    type: AppError['type'],
    message: string,
    details?: unknown,
    recoverable = true
  ) => {
    const error = createAppError(type, message, details, recoverable);
    dispatch(setError(error));
    return error;
  }, [dispatch]);

  return { 
    error, 
    hasError, 
    setError: setErrorState, 
    clearError: clearErrorState,
    createError
  };
};

export const useCurrentView = () => {
  const { state, dispatch } = useAppContext();
  
  const currentView = selectors.getCurrentView(state);
  
  const setView = useCallback((view: AppState['currentView']) => {
    dispatch(setCurrentView(view));
  }, [dispatch]);

  return { currentView, setCurrentView: setView };
};

export const useTheme = () => {
  const { state, dispatch } = useAppContext();
  
  const theme = selectors.getTheme(state);
  
  const setThemeState = useCallback((theme: 'light' | 'dark') => {
    dispatch(setTheme(theme));
  }, [dispatch]);

  return { theme, setTheme: setThemeState };
};

// ============================================================================
// Books Hooks
// ============================================================================

export const useBooks = () => {
  const { state, dispatch } = useAppContext();
  
  const books = selectors.getBooks(state);
  const currentBook = selectors.getCurrentBook(state);
  const recentBooks = selectors.getRecentBooks(state);
  
  const setBooksState = useCallback((books: BookMetadata[]) => {
    dispatch(setBooks(books));
  }, [dispatch]);

  const addBookState = useCallback((book: BookMetadata) => {
    dispatch(addBook(book));
  }, [dispatch]);

  const updateBookState = useCallback((bookId: string, updates: Partial<BookMetadata>) => {
    dispatch(updateBook(bookId, updates));
  }, [dispatch]);

  const deleteBookState = useCallback((bookId: string) => {
    dispatch(deleteBook(bookId));
  }, [dispatch]);

  const setCurrentBookState = useCallback((book: BookMetadata | null) => {
    dispatch(setCurrentBook(book));
  }, [dispatch]);

  const openBookState = useCallback((book: BookMetadata) => {
    const actions = openBook(book);
    actions.forEach(action => dispatch(action));
  }, [dispatch]);

  const closeBookState = useCallback(() => {
    const actions = closeBook();
    actions.forEach(action => dispatch(action));
  }, [dispatch]);

  const getBookById = useCallback((bookId: string) => {
    return selectors.getBookById(state, bookId);
  }, [state]);

  return {
    books,
    currentBook,
    recentBooks,
    setBooks: setBooksState,
    addBook: addBookState,
    updateBook: updateBookState,
    deleteBook: deleteBookState,
    setCurrentBook: setCurrentBookState,
    openBook: openBookState,
    closeBook: closeBookState,
    getBookById
  };
};

// ============================================================================
// Reading Progress Hooks
// ============================================================================

export const useReadingProgress = () => {
  const { state, dispatch } = useAppContext();
  
  const readingProgress = selectors.getReadingProgress(state);
  
  const setProgressState = useCallback((progress: ReadingProgress | null) => {
    dispatch(setReadingProgress(progress));
  }, [dispatch]);

  const updateProgressState = useCallback((updates: Partial<ReadingProgress>) => {
    dispatch(updateReadingProgress(updates));
  }, [dispatch]);

  const hasProgress = useCallback((bookId: string) => {
    return selectors.hasReadingProgress(state, bookId);
  }, [state]);

  return {
    readingProgress,
    setReadingProgress: setProgressState,
    updateReadingProgress: updateProgressState,
    hasProgress
  };
};

// ============================================================================
// Vocabulary Hooks
// ============================================================================

export const useVocabulary = () => {
  const { state, dispatch } = useAppContext();
  
  const vocabulary = selectors.getVocabulary(state);
  const vocabularyStats = selectors.getVocabularyStats(state);
  const unmasteredVocabulary = selectors.getUnmasteredVocabulary(state);
  
  const setVocabularyState = useCallback((vocabulary: VocabularyItem[]) => {
    dispatch(setVocabulary(vocabulary));
  }, [dispatch]);

  const addVocabularyItemState = useCallback((item: VocabularyItem) => {
    dispatch(addVocabularyItem(item));
  }, [dispatch]);

  const updateVocabularyItemState = useCallback((wordId: string, updates: Partial<VocabularyItem>) => {
    dispatch(updateVocabularyItem(wordId, updates));
  }, [dispatch]);

  const deleteVocabularyItemState = useCallback((wordId: string) => {
    dispatch(deleteVocabularyItem(wordId));
  }, [dispatch]);

  const markAsMastered = useCallback((wordId: string, mastered: boolean) => {
    dispatch(markVocabularyAsMastered(wordId, mastered));
  }, [dispatch]);

  const getVocabularyByBook = useCallback((bookId: string) => {
    return selectors.getVocabularyByBook(state, bookId);
  }, [state]);

  return {
    vocabulary,
    vocabularyStats,
    unmasteredVocabulary,
    setVocabulary: setVocabularyState,
    addVocabularyItem: addVocabularyItemState,
    updateVocabularyItem: updateVocabularyItemState,
    deleteVocabularyItem: deleteVocabularyItemState,
    markAsMastered,
    getVocabularyByBook
  };
};

// ============================================================================
// Settings Hooks
// ============================================================================

export const useAppSettings = () => {
  const { state, dispatch } = useAppContext();
  
  const settings = selectors.getAppSettings(state);
  const language = selectors.getLanguage(state);
  const isAutoSaveEnabled = selectors.isAutoSaveEnabled(state);
  
  const setSettingsState = useCallback((settings: AppSettings) => {
    dispatch(setAppSettings(settings));
  }, [dispatch]);

  const updateSettingsState = useCallback((updates: Partial<AppSettings>) => {
    dispatch(updateAppSettings(updates));
  }, [dispatch]);

  return {
    settings,
    language,
    isAutoSaveEnabled,
    setAppSettings: setSettingsState,
    updateAppSettings: updateSettingsState
  };
};

// ============================================================================
// Compound Hooks (for common operations)
// ============================================================================

export const useBookOperations = () => {
  const { addBook, updateBook, deleteBook } = useBooks();
  const { setLoading, createError } = useError();
  
  const importBook = useCallback(async (filePath: string) => {
    try {
      setLoading(true);
      
      // This would typically call the IPC service
      // For now, we'll just simulate the operation
      const bookMetadata: BookMetadata = {
        id: Date.now().toString(),
        title: 'Sample Book',
        author: 'Sample Author',
        format: 'epub',
        filePath,
        fileSize: 1024000,
        importDate: new Date(),
        totalPages: 100,
        language: 'zh-CN'
      };
      
      addBook(bookMetadata);
      return bookMetadata;
    } catch (error) {
      createError('PARSE_ERROR', 'Failed to import book', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addBook, setLoading, createError]);

  const removeBook = useCallback(async (bookId: string) => {
    try {
      setLoading(true);
      
      // This would typically call the IPC service to delete files
      deleteBook(bookId);
    } catch (error) {
      createError('DATABASE_ERROR', 'Failed to delete book', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [deleteBook, setLoading, createError]);

  return {
    importBook,
    removeBook
  };
};

export const useVocabularyOperations = () => {
  const { addVocabularyItem, deleteVocabularyItem, markAsMastered } = useVocabulary();
  const { createError } = useError();
  
  const addWord = useCallback(async (word: string, translation: string, bookId: string, context: string) => {
    try {
      const vocabularyItem: VocabularyItem = {
        id: Date.now().toString(),
        word,
        translation,
        bookId,
        context,
        addedDate: new Date(),
        mastered: false
      };
      
      addVocabularyItem(vocabularyItem);
      return vocabularyItem;
    } catch (error) {
      createError('DATABASE_ERROR', 'Failed to add vocabulary item', error);
      throw error;
    }
  }, [addVocabularyItem, createError]);

  const removeWord = useCallback(async (wordId: string) => {
    try {
      deleteVocabularyItem(wordId);
    } catch (error) {
      createError('DATABASE_ERROR', 'Failed to delete vocabulary item', error);
      throw error;
    }
  }, [deleteVocabularyItem, createError]);

  const toggleMastered = useCallback(async (wordId: string, mastered: boolean) => {
    try {
      markAsMastered(wordId, mastered);
    } catch (error) {
      createError('DATABASE_ERROR', 'Failed to update vocabulary item', error);
      throw error;
    }
  }, [markAsMastered, createError]);

  return {
    addWord,
    removeWord,
    toggleMastered
  };
};

// ============================================================================
// Utility Hooks
// ============================================================================

export const useStateReset = () => {
  const { dispatch } = useAppContext();
  
  const reset = useCallback(() => {
    dispatch(resetState());
  }, [dispatch]);

  return { resetState: reset };
};

// Hook for debugging (development only)
export const useStateDebug = () => {
  const { state } = useAppContext();
  
  const logState = useCallback(() => {
    console.log('Current App State:', state);
  }, [state]);

  const getStateSnapshot = useCallback(() => {
    return JSON.parse(JSON.stringify(state));
  }, [state]);

  return {
    logState,
    getStateSnapshot,
    state
  };
};