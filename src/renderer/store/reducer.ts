// Main reducer for the application state

import { AppState } from '../../shared/types';
import { AppAction, ActionType } from './types';

// ============================================================================
// Initial State
// ============================================================================

export const initialState: AppState = {
  currentView: 'bookshelf',
  books: [],
  currentBook: null,
  readingProgress: null,
  vocabulary: [],
  settings: {
    theme: 'system',
    language: 'zh-CN',
    autoSave: true,
    cacheSize: 500 // MB
  },
  theme: 'light',
  loading: false,
  error: null,
  successMessage: null
};

// ============================================================================
// Reducer Function
// ============================================================================

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // App State Actions
    case ActionType.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case ActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case ActionType.SET_SUCCESS_MESSAGE:
      return {
        ...state,
        successMessage: action.payload,
        error: null
      };

    case ActionType.CLEAR_SUCCESS_MESSAGE:
      return {
        ...state,
        successMessage: null
      };

    case ActionType.SET_CURRENT_VIEW:
      return {
        ...state,
        currentView: action.payload
      };

    case ActionType.SET_THEME:
      return {
        ...state,
        theme: action.payload
      };

    // Books Actions
    case ActionType.SET_BOOKS:
      return {
        ...state,
        books: action.payload
      };

    case ActionType.ADD_BOOK:
      return {
        ...state,
        books: [...state.books, action.payload]
      };

    case ActionType.UPDATE_BOOK:
      return {
        ...state,
        books: state.books.map(book =>
          book.id === action.payload.bookId
            ? { ...book, ...action.payload.updates }
            : book
        ),
        // Update current book if it's the one being updated
        currentBook: state.currentBook?.id === action.payload.bookId
          ? { ...state.currentBook, ...action.payload.updates }
          : state.currentBook
      };

    case ActionType.DELETE_BOOK:
      return {
        ...state,
        books: state.books.filter(book => book.id !== action.payload),
        // Clear current book if it's the one being deleted
        currentBook: state.currentBook?.id === action.payload ? null : state.currentBook,
        // Clear reading progress if it's for the deleted book
        readingProgress: state.readingProgress?.bookId === action.payload ? null : state.readingProgress,
        // Remove vocabulary items for the deleted book
        vocabulary: state.vocabulary.filter(item => item.bookId !== action.payload)
      };

    case ActionType.SET_CURRENT_BOOK:
      return {
        ...state,
        currentBook: action.payload
      };

    // Reading Progress Actions
    case ActionType.SET_READING_PROGRESS:
      return {
        ...state,
        readingProgress: action.payload
      };

    case ActionType.UPDATE_READING_PROGRESS:
      return {
        ...state,
        readingProgress: state.readingProgress
          ? { ...state.readingProgress, ...action.payload }
          : null
      };

    // Vocabulary Actions
    case ActionType.SET_VOCABULARY:
      return {
        ...state,
        vocabulary: action.payload
      };

    case ActionType.ADD_VOCABULARY_ITEM:
      return {
        ...state,
        vocabulary: [...state.vocabulary, action.payload]
      };

    case ActionType.UPDATE_VOCABULARY_ITEM:
      return {
        ...state,
        vocabulary: state.vocabulary.map(item =>
          item.id === action.payload.wordId
            ? { ...item, ...action.payload.updates }
            : item
        )
      };

    case ActionType.DELETE_VOCABULARY_ITEM:
      return {
        ...state,
        vocabulary: state.vocabulary.filter(item => item.id !== action.payload)
      };

    // Settings Actions
    case ActionType.SET_APP_SETTINGS:
      return {
        ...state,
        settings: action.payload
      };

    case ActionType.UPDATE_APP_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    // Batch Operations
    case ActionType.RESET_STATE:
      return initialState;

    case ActionType.HYDRATE_STATE:
      return {
        ...state,
        ...action.payload
      };

    default:
      return state;
  }
}

// ============================================================================
// Selector Functions
// ============================================================================

export const selectors = {
  // Books selectors
  getBooks: (state: AppState) => state.books,
  getCurrentBook: (state: AppState) => state.currentBook,
  getBookById: (state: AppState, bookId: string) => 
    state.books.find(book => book.id === bookId) || null,
  getRecentBooks: (state: AppState, limit = 5) =>
    state.books
      .filter(book => book.lastReadDate)
      .sort((a, b) => 
        new Date(b.lastReadDate!).getTime() - new Date(a.lastReadDate!).getTime()
      )
      .slice(0, limit),

  // Vocabulary selectors
  getVocabulary: (state: AppState) => state.vocabulary,
  getVocabularyByBook: (state: AppState, bookId: string) =>
    state.vocabulary.filter(item => item.bookId === bookId),
  getUnmasteredVocabulary: (state: AppState) =>
    state.vocabulary.filter(item => !item.mastered),
  getVocabularyStats: (state: AppState) => ({
    total: state.vocabulary.length,
    mastered: state.vocabulary.filter(item => item.mastered).length,
    unmastered: state.vocabulary.filter(item => !item.mastered).length
  }),

  // Progress selectors
  getReadingProgress: (state: AppState) => state.readingProgress,
  hasReadingProgress: (state: AppState, bookId: string) =>
    state.readingProgress?.bookId === bookId,

  // UI selectors
  getCurrentView: (state: AppState) => state.currentView,
  getTheme: (state: AppState) => state.theme,
  isLoading: (state: AppState) => state.loading,
  getError: (state: AppState) => state.error,
  hasError: (state: AppState) => state.error !== null,

  // Settings selectors
  getAppSettings: (state: AppState) => state.settings,
  getLanguage: (state: AppState) => state.settings.language,
  isAutoSaveEnabled: (state: AppState) => state.settings.autoSave
};