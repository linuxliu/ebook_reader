// Action creators for the application state

import { BookMetadata, ReadingProgress, VocabularyItem, AppSettings, AppError, AppState } from '../../shared/types';
import { 
  ActionType, 
  AppAction,
  SetLoadingAction,
  SetErrorAction,
  ClearErrorAction,
  SetSuccessMessageAction,
  ClearSuccessMessageAction,
  SetCurrentViewAction,
  SetThemeAction,
  SetBooksAction,
  AddBookAction,
  UpdateBookAction,
  DeleteBookAction,
  SetCurrentBookAction,
  SetReadingProgressAction,
  UpdateReadingProgressAction,
  SetVocabularyAction,
  AddVocabularyItemAction,
  UpdateVocabularyItemAction,
  DeleteVocabularyItemAction,
  SetAppSettingsAction,
  UpdateAppSettingsAction,
  ResetStateAction,
  HydrateStateAction
} from './types';

// ============================================================================
// App State Action Creators
// ============================================================================

export const setLoading = (loading: boolean): SetLoadingAction => ({
  type: ActionType.SET_LOADING,
  payload: loading
});

export const setError = (error: AppError): SetErrorAction => ({
  type: ActionType.SET_ERROR,
  payload: error
});

export const clearError = (): ClearErrorAction => ({
  type: ActionType.CLEAR_ERROR
});

export const setSuccessMessage = (message: string): SetSuccessMessageAction => ({
  type: ActionType.SET_SUCCESS_MESSAGE,
  payload: message
});

export const clearSuccessMessage = (): ClearSuccessMessageAction => ({
  type: ActionType.CLEAR_SUCCESS_MESSAGE
});

export const setCurrentView = (view: AppState['currentView']): SetCurrentViewAction => ({
  type: ActionType.SET_CURRENT_VIEW,
  payload: view
});

export const setTheme = (theme: 'light' | 'dark'): SetThemeAction => ({
  type: ActionType.SET_THEME,
  payload: theme
});

// ============================================================================
// Books Action Creators
// ============================================================================

export const setBooks = (books: BookMetadata[]): SetBooksAction => ({
  type: ActionType.SET_BOOKS,
  payload: books
});

export const addBook = (book: BookMetadata): AddBookAction => ({
  type: ActionType.ADD_BOOK,
  payload: book
});

export const updateBook = (bookId: string, updates: Partial<BookMetadata>): UpdateBookAction => ({
  type: ActionType.UPDATE_BOOK,
  payload: { bookId, updates }
});

export const deleteBook = (bookId: string): DeleteBookAction => ({
  type: ActionType.DELETE_BOOK,
  payload: bookId
});

export const setCurrentBook = (book: BookMetadata | null): SetCurrentBookAction => ({
  type: ActionType.SET_CURRENT_BOOK,
  payload: book
});

// ============================================================================
// Reading Progress Action Creators
// ============================================================================

export const setReadingProgress = (progress: ReadingProgress | null): SetReadingProgressAction => ({
  type: ActionType.SET_READING_PROGRESS,
  payload: progress
});

export const updateReadingProgress = (updates: Partial<ReadingProgress>): UpdateReadingProgressAction => ({
  type: ActionType.UPDATE_READING_PROGRESS,
  payload: updates
});

// ============================================================================
// Vocabulary Action Creators
// ============================================================================

export const setVocabulary = (vocabulary: VocabularyItem[]): SetVocabularyAction => ({
  type: ActionType.SET_VOCABULARY,
  payload: vocabulary
});

export const addVocabularyItem = (item: VocabularyItem): AddVocabularyItemAction => ({
  type: ActionType.ADD_VOCABULARY_ITEM,
  payload: item
});

export const updateVocabularyItem = (wordId: string, updates: Partial<VocabularyItem>): UpdateVocabularyItemAction => ({
  type: ActionType.UPDATE_VOCABULARY_ITEM,
  payload: { wordId, updates }
});

export const deleteVocabularyItem = (wordId: string): DeleteVocabularyItemAction => ({
  type: ActionType.DELETE_VOCABULARY_ITEM,
  payload: wordId
});

// ============================================================================
// Settings Action Creators
// ============================================================================

export const setAppSettings = (settings: AppSettings): SetAppSettingsAction => ({
  type: ActionType.SET_APP_SETTINGS,
  payload: settings
});

export const updateAppSettings = (updates: Partial<AppSettings>): UpdateAppSettingsAction => ({
  type: ActionType.UPDATE_APP_SETTINGS,
  payload: updates
});

// ============================================================================
// Batch Operation Action Creators
// ============================================================================

export const resetState = (): ResetStateAction => ({
  type: ActionType.RESET_STATE
});

export const hydrateState = (state: Partial<AppState>): HydrateStateAction => ({
  type: ActionType.HYDRATE_STATE,
  payload: state
});

// ============================================================================
// Compound Action Creators (for common operations)
// ============================================================================

export const createAppError = (
  type: AppError['type'],
  message: string,
  details?: unknown,
  recoverable = true
): AppError => ({
  type,
  message,
  details,
  timestamp: new Date(),
  recoverable
});

// Action creator for opening a book (sets current book and loads progress)
export const openBook = (book: BookMetadata): AppAction[] => [
  setCurrentBook(book),
  setCurrentView('reader'),
  updateBook(book.id, { lastReadDate: new Date() })
];

// Action creator for closing a book
export const closeBook = (): AppAction[] => [
  setCurrentBook(null),
  setReadingProgress(null),
  setCurrentView('bookshelf')
];

// Action creator for marking a vocabulary item as mastered
export const markVocabularyAsMastered = (wordId: string, mastered: boolean): UpdateVocabularyItemAction => 
  updateVocabularyItem(wordId, { mastered });

// Action creator for updating theme based on system preference
export const updateThemeFromSystem = (systemTheme: 'light' | 'dark'): SetThemeAction => 
  setTheme(systemTheme);