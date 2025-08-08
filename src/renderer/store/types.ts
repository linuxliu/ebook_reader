// State management types for the React application

import { AppState, BookMetadata, ReadingProgress, VocabularyItem, AppSettings, ReadingSettings, AppError } from '../../shared/types';

// ============================================================================
// Action Types
// ============================================================================

export enum ActionType {
  // App State
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SET_SUCCESS_MESSAGE = 'SET_SUCCESS_MESSAGE',
  CLEAR_SUCCESS_MESSAGE = 'CLEAR_SUCCESS_MESSAGE',
  SET_CURRENT_VIEW = 'SET_CURRENT_VIEW',
  SET_THEME = 'SET_THEME',
  
  // Books
  SET_BOOKS = 'SET_BOOKS',
  ADD_BOOK = 'ADD_BOOK',
  UPDATE_BOOK = 'UPDATE_BOOK',
  DELETE_BOOK = 'DELETE_BOOK',
  SET_CURRENT_BOOK = 'SET_CURRENT_BOOK',
  
  // Reading Progress
  SET_READING_PROGRESS = 'SET_READING_PROGRESS',
  UPDATE_READING_PROGRESS = 'UPDATE_READING_PROGRESS',
  
  // Vocabulary
  SET_VOCABULARY = 'SET_VOCABULARY',
  ADD_VOCABULARY_ITEM = 'ADD_VOCABULARY_ITEM',
  UPDATE_VOCABULARY_ITEM = 'UPDATE_VOCABULARY_ITEM',
  DELETE_VOCABULARY_ITEM = 'DELETE_VOCABULARY_ITEM',
  
  // Settings
  SET_APP_SETTINGS = 'SET_APP_SETTINGS',
  UPDATE_APP_SETTINGS = 'UPDATE_APP_SETTINGS',
  
  // Batch Operations
  RESET_STATE = 'RESET_STATE',
  HYDRATE_STATE = 'HYDRATE_STATE'
}

// ============================================================================
// Action Interfaces
// ============================================================================

export interface SetLoadingAction {
  type: ActionType.SET_LOADING;
  payload: boolean;
}

export interface SetErrorAction {
  type: ActionType.SET_ERROR;
  payload: AppError;
}

export interface ClearErrorAction {
  type: ActionType.CLEAR_ERROR;
}

export interface SetSuccessMessageAction {
  type: ActionType.SET_SUCCESS_MESSAGE;
  payload: string;
}

export interface ClearSuccessMessageAction {
  type: ActionType.CLEAR_SUCCESS_MESSAGE;
}

export interface SetCurrentViewAction {
  type: ActionType.SET_CURRENT_VIEW;
  payload: AppState['currentView'];
}

export interface SetThemeAction {
  type: ActionType.SET_THEME;
  payload: 'light' | 'dark';
}

export interface SetBooksAction {
  type: ActionType.SET_BOOKS;
  payload: BookMetadata[];
}

export interface AddBookAction {
  type: ActionType.ADD_BOOK;
  payload: BookMetadata;
}

export interface UpdateBookAction {
  type: ActionType.UPDATE_BOOK;
  payload: {
    bookId: string;
    updates: Partial<BookMetadata>;
  };
}

export interface DeleteBookAction {
  type: ActionType.DELETE_BOOK;
  payload: string; // bookId
}

export interface SetCurrentBookAction {
  type: ActionType.SET_CURRENT_BOOK;
  payload: BookMetadata | null;
}

export interface SetReadingProgressAction {
  type: ActionType.SET_READING_PROGRESS;
  payload: ReadingProgress | null;
}

export interface UpdateReadingProgressAction {
  type: ActionType.UPDATE_READING_PROGRESS;
  payload: Partial<ReadingProgress>;
}

export interface SetVocabularyAction {
  type: ActionType.SET_VOCABULARY;
  payload: VocabularyItem[];
}

export interface AddVocabularyItemAction {
  type: ActionType.ADD_VOCABULARY_ITEM;
  payload: VocabularyItem;
}

export interface UpdateVocabularyItemAction {
  type: ActionType.UPDATE_VOCABULARY_ITEM;
  payload: {
    wordId: string;
    updates: Partial<VocabularyItem>;
  };
}

export interface DeleteVocabularyItemAction {
  type: ActionType.DELETE_VOCABULARY_ITEM;
  payload: string; // wordId
}

export interface SetAppSettingsAction {
  type: ActionType.SET_APP_SETTINGS;
  payload: AppSettings;
}

export interface UpdateAppSettingsAction {
  type: ActionType.UPDATE_APP_SETTINGS;
  payload: Partial<AppSettings>;
}

export interface ResetStateAction {
  type: ActionType.RESET_STATE;
}

export interface HydrateStateAction {
  type: ActionType.HYDRATE_STATE;
  payload: Partial<AppState>;
}

// ============================================================================
// Union Type for All Actions
// ============================================================================

export type AppAction =
  | SetLoadingAction
  | SetErrorAction
  | ClearErrorAction
  | SetSuccessMessageAction
  | ClearSuccessMessageAction
  | SetCurrentViewAction
  | SetThemeAction
  | SetBooksAction
  | AddBookAction
  | UpdateBookAction
  | DeleteBookAction
  | SetCurrentBookAction
  | SetReadingProgressAction
  | UpdateReadingProgressAction
  | SetVocabularyAction
  | AddVocabularyItemAction
  | UpdateVocabularyItemAction
  | DeleteVocabularyItemAction
  | SetAppSettingsAction
  | UpdateAppSettingsAction
  | ResetStateAction
  | HydrateStateAction;

// ============================================================================
// State Persistence Types
// ============================================================================

export interface PersistedState {
  theme: 'light' | 'dark';
  settings: AppSettings;
  currentView: AppState['currentView'];
  lastOpenBook?: string; // bookId
}

export interface StateStorage {
  save(key: string, data: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}