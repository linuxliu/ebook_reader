import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppError } from '../../shared/types';
import { logError } from '../services/ErrorLogger';

interface ErrorState {
  errors: AppError[];
  currentError: AppError | null;
  isErrorModalOpen: boolean;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CURRENT_ERROR'; payload: AppError | null }
  | { type: 'TOGGLE_ERROR_MODAL'; payload?: boolean };

interface ErrorContextType {
  state: ErrorState;
  addError: (error: AppError) => void;
  removeError: (timestamp: string) => void;
  clearErrors: () => void;
  setCurrentError: (error: AppError | null) => void;
  toggleErrorModal: (open?: boolean) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

const errorReducer = (state: ErrorState, action: ErrorAction): ErrorState => {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
        currentError: action.payload,
      };
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(
          error => error.timestamp.toISOString() !== action.payload
        ),
      };
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        currentError: null,
      };
    
    case 'SET_CURRENT_ERROR':
      return {
        ...state,
        currentError: action.payload,
      };
    
    case 'TOGGLE_ERROR_MODAL':
      return {
        ...state,
        isErrorModalOpen: action.payload ?? !state.isErrorModalOpen,
      };
    
    default:
      return state;
  }
};

const initialState: ErrorState = {
  errors: [],
  currentError: null,
  isErrorModalOpen: false,
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const addError = (error: AppError) => {
    // 记录错误到日志系统
    logError(error);
    
    // 添加到状态
    dispatch({ type: 'ADD_ERROR', payload: error });
  };

  const removeError = (timestamp: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: timestamp });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const setCurrentError = (error: AppError | null) => {
    dispatch({ type: 'SET_CURRENT_ERROR', payload: error });
  };

  const toggleErrorModal = (open?: boolean) => {
    dispatch({ type: 'TOGGLE_ERROR_MODAL', payload: open });
  };

  const value: ErrorContextType = {
    state,
    addError,
    removeError,
    clearErrors,
    setCurrentError,
    toggleErrorModal,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorContext;