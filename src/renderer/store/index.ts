// Main export file for the state management system

// Context and Provider
export { AppProvider, useAppContext, stateStorage } from './context';

// Hooks
export {
  useAppState,
  useLoading,
  useError,
  useCurrentView,
  useTheme,
  useBooks,
  useReadingProgress,
  useVocabulary,
  useAppSettings,
  useBookOperations,
  useVocabularyOperations,
  useStateReset,
  useStateDebug
} from './hooks';

// Actions (for advanced usage)
export * from './actions';

// Types (for TypeScript support)
export type { AppAction, StateStorage, PersistedState } from './types';
export { ActionType } from './types';

// Reducer and selectors (for testing and advanced usage)
export { appReducer, initialState, selectors } from './reducer';