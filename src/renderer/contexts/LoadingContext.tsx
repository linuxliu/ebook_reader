import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ImportProgress } from '../../shared/types';

interface LoadingState {
  isGlobalLoading: boolean;
  globalMessage: string;
  globalProgress?: number;
  importProgresses: Record<string, ImportProgress>;
  operationLoading: Record<string, boolean>;
}

type LoadingAction =
  | { type: 'START_GLOBAL_LOADING'; payload: { message: string; showProgress?: boolean } }
  | { type: 'STOP_GLOBAL_LOADING' }
  | { type: 'SET_GLOBAL_PROGRESS'; payload: number }
  | { type: 'SET_GLOBAL_MESSAGE'; payload: string }
  | { type: 'ADD_IMPORT_PROGRESS'; payload: ImportProgress }
  | { type: 'UPDATE_IMPORT_PROGRESS'; payload: ImportProgress }
  | { type: 'REMOVE_IMPORT_PROGRESS'; payload: string }
  | { type: 'START_OPERATION'; payload: string }
  | { type: 'STOP_OPERATION'; payload: string };

interface LoadingContextType {
  state: LoadingState;
  startGlobalLoading: (message: string, showProgress?: boolean) => void;
  stopGlobalLoading: () => void;
  setGlobalProgress: (progress: number) => void;
  setGlobalMessage: (message: string) => void;
  addImportProgress: (progress: ImportProgress) => void;
  updateImportProgress: (progress: ImportProgress) => void;
  removeImportProgress: (bookId: string) => void;
  startOperation: (operationId: string) => void;
  stopOperation: (operationId: string) => void;
  isOperationLoading: (operationId: string) => boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const loadingReducer = (state: LoadingState, action: LoadingAction): LoadingState => {
  switch (action.type) {
    case 'START_GLOBAL_LOADING':
      return {
        ...state,
        isGlobalLoading: true,
        globalMessage: action.payload.message,
        globalProgress: action.payload.showProgress ? 0 : undefined,
      };
    
    case 'STOP_GLOBAL_LOADING':
      return {
        ...state,
        isGlobalLoading: false,
        globalProgress: undefined,
      };
    
    case 'SET_GLOBAL_PROGRESS':
      return {
        ...state,
        globalProgress: action.payload,
      };
    
    case 'SET_GLOBAL_MESSAGE':
      return {
        ...state,
        globalMessage: action.payload,
      };
    
    case 'ADD_IMPORT_PROGRESS':
      return {
        ...state,
        importProgresses: {
          ...state.importProgresses,
          [action.payload.bookId]: action.payload,
        },
      };
    
    case 'UPDATE_IMPORT_PROGRESS':
      return {
        ...state,
        importProgresses: {
          ...state.importProgresses,
          [action.payload.bookId]: action.payload,
        },
      };
    
    case 'REMOVE_IMPORT_PROGRESS':
      const { [action.payload]: removed, ...remainingProgresses } = state.importProgresses;
      return {
        ...state,
        importProgresses: remainingProgresses,
      };
    
    case 'START_OPERATION':
      return {
        ...state,
        operationLoading: {
          ...state.operationLoading,
          [action.payload]: true,
        },
      };
    
    case 'STOP_OPERATION':
      const { [action.payload]: removedOp, ...remainingOps } = state.operationLoading;
      return {
        ...state,
        operationLoading: remainingOps,
      };
    
    default:
      return state;
  }
};

const initialState: LoadingState = {
  isGlobalLoading: false,
  globalMessage: '加载中...',
  globalProgress: undefined,
  importProgresses: {},
  operationLoading: {},
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const startGlobalLoading = (message: string, showProgress = false) => {
    dispatch({ type: 'START_GLOBAL_LOADING', payload: { message, showProgress } });
  };

  const stopGlobalLoading = () => {
    dispatch({ type: 'STOP_GLOBAL_LOADING' });
  };

  const setGlobalProgress = (progress: number) => {
    dispatch({ type: 'SET_GLOBAL_PROGRESS', payload: progress });
  };

  const setGlobalMessage = (message: string) => {
    dispatch({ type: 'SET_GLOBAL_MESSAGE', payload: message });
  };

  const addImportProgress = (progress: ImportProgress) => {
    dispatch({ type: 'ADD_IMPORT_PROGRESS', payload: progress });
  };

  const updateImportProgress = (progress: ImportProgress) => {
    dispatch({ type: 'UPDATE_IMPORT_PROGRESS', payload: progress });
  };

  const removeImportProgress = (bookId: string) => {
    dispatch({ type: 'REMOVE_IMPORT_PROGRESS', payload: bookId });
  };

  const startOperation = (operationId: string) => {
    dispatch({ type: 'START_OPERATION', payload: operationId });
  };

  const stopOperation = (operationId: string) => {
    dispatch({ type: 'STOP_OPERATION', payload: operationId });
  };

  const isOperationLoading = (operationId: string) => {
    return state.operationLoading[operationId] || false;
  };

  const value: LoadingContextType = {
    state,
    startGlobalLoading,
    stopGlobalLoading,
    setGlobalProgress,
    setGlobalMessage,
    addImportProgress,
    updateImportProgress,
    removeImportProgress,
    startOperation,
    stopOperation,
    isOperationLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;