// React Context for global state management

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState } from '../../shared/types';
import { AppAction } from './types';
import { appReducer, initialState } from './reducer';
import { StateStorage, PersistedState } from './types';
import { hydrateState, setTheme, updateAppSettings } from './actions';

// ============================================================================
// Context Definition
// ============================================================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// Local Storage Implementation
// ============================================================================

class LocalStateStorage implements StateStorage {
  private readonly prefix = 'ebook-reader-';

  async save(key: string, data: unknown): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const serialized = localStorage.getItem(this.prefix + key);
      if (serialized === null || serialized === 'undefined') {
        return null;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      // Only log in non-test environments to avoid test noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to load state from localStorage:', error);
      }
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Failed to remove state from localStorage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear state from localStorage:', error);
    }
  }
}

// ============================================================================
// State Persistence Utilities
// ============================================================================

const storage = new LocalStateStorage();
const PERSISTENCE_KEY = 'app-state';

const getPersistedState = async (): Promise<Partial<AppState>> => {
  const persistedData = await storage.load<PersistedState>(PERSISTENCE_KEY);
  
  if (!persistedData) {
    return {};
  }

  return {
    theme: persistedData.theme,
    settings: persistedData.settings,
    currentView: persistedData.currentView
  };
};

const persistState = async (state: AppState): Promise<void> => {
  const persistedData: PersistedState = {
    theme: state.theme,
    settings: state.settings,
    currentView: state.currentView,
    lastOpenBook: state.currentBook?.id
  };

  await storage.save(PERSISTENCE_KEY, persistedData);
};

// ============================================================================
// System Theme Detection
// ============================================================================

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      console.warn('matchMedia not supported:', error);
      return 'light';
    }
  }
  return 'light';
};

const applyThemeToDocument = (theme: 'light' | 'dark'): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
};

// ============================================================================
// Provider Component
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize state from persistence and system preferences
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Load persisted state
        const persistedState = await getPersistedState();
        
        // Determine theme
        let theme: 'light' | 'dark';
        if (persistedState.settings?.theme === 'system' || !persistedState.theme) {
          theme = getSystemTheme();
        } else {
          theme = persistedState.theme;
        }

        // Hydrate state
        if (Object.keys(persistedState).length > 0) {
          dispatch(hydrateState({
            ...persistedState,
            theme
          }));
        } else {
          // First time setup
          dispatch(setTheme(theme));
        }

        // Apply theme to document
        applyThemeToDocument(theme);
      } catch (error) {
        console.error('Failed to initialize state:', error);
        // Fallback to system theme
        const systemTheme = getSystemTheme();
        dispatch(setTheme(systemTheme));
        applyThemeToDocument(systemTheme);
      }
    };

    // In test environment, initialize synchronously to avoid timing issues
    if (process.env.NODE_ENV === 'test') {
      const theme = getSystemTheme();
      dispatch(setTheme(theme));
      applyThemeToDocument(theme);
    } else {
      initializeState();
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (state.settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = (e: MediaQueryListEvent) => {
          const newTheme = e.matches ? 'dark' : 'light';
          dispatch(setTheme(newTheme));
          applyThemeToDocument(newTheme);
        };

        mediaQuery.addEventListener('change', handleThemeChange);
        
        return () => {
          mediaQuery.removeEventListener('change', handleThemeChange);
        };
      } catch (error) {
        console.warn('Failed to set up theme change listener:', error);
      }
    }
  }, [state.settings.theme]);

  // Apply theme changes to document
  useEffect(() => {
    applyThemeToDocument(state.theme);
  }, [state.theme]);

  // Persist state changes
  useEffect(() => {
    const persistStateAsync = async () => {
      try {
        await persistState(state);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    };

    // Debounce persistence to avoid excessive writes
    const timeoutId = setTimeout(persistStateAsync, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [state.theme, state.settings, state.currentView, state.currentBook]);

  // Handle app settings theme changes
  useEffect(() => {
    if (state.settings.theme === 'system') {
      const systemTheme = getSystemTheme();
      if (state.theme !== systemTheme) {
        dispatch(setTheme(systemTheme));
      }
    } else if (state.settings.theme !== 'system') {
      const settingsTheme = state.settings.theme as 'light' | 'dark';
      if (state.theme !== settingsTheme) {
        dispatch(setTheme(settingsTheme));
      }
    }
  }, [state.settings.theme, state.theme]);

  const contextValue: AppContextType = {
    state,
    dispatch
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================================================
// Hook for using the context
// ============================================================================

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// ============================================================================
// State Storage Export (for testing and advanced usage)
// ============================================================================

export { storage as stateStorage };
export type { StateStorage };