import { ErrorLogger } from '../ErrorLogger';
import { AppError, ErrorType } from '../../../shared/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock console methods
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

Object.defineProperty(console, 'error', { value: mockConsole.error });
Object.defineProperty(console, 'warn', { value: mockConsole.warn });
Object.defineProperty(console, 'info', { value: mockConsole.info });

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    errorLogger = new ErrorLogger();
  });

  describe('logError', () => {
    const mockError: AppError = {
      type: ErrorType.FILE_NOT_FOUND,
      message: 'Test error message',
      details: { fileName: 'test.epub' },
      timestamp: new Date('2024-01-01T10:00:00Z'),
      recoverable: true
    };

    it('should log error to console and localStorage', () => {
      errorLogger.logError(mockError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ErrorLogger]',
        mockError.type,
        mockError.message,
        mockError.details
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle error without details', () => {
      const errorWithoutDetails: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error',
        timestamp: new Date(),
        recoverable: false
      };

      errorLogger.logError(errorWithoutDetails);

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ErrorLogger]',
        errorWithoutDetails.type,
        errorWithoutDetails.message,
        undefined
      );
    });

    it('should limit stored errors to maximum count', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({
          ...mockError,
          message: `Error ${i}`,
          timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`)
        }))
      ));

      errorLogger.logError(mockError);

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const storedErrors = JSON.parse(setItemCall[1]);
      expect(storedErrors).toHaveLength(100); // Should maintain max limit
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => errorLogger.logError(mockError)).not.toThrow();
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ErrorLogger]',
        mockError.type,
        mockError.message,
        mockError.details
      );
    });
  });

  describe('getErrorHistory', () => {
    it('should return error history from localStorage', () => {
      const mockErrors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'Error 1',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        },
        {
          type: ErrorType.PARSE_ERROR,
          message: 'Error 2',
          timestamp: '2024-01-01T11:00:00Z',
          recoverable: false
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const history = errorLogger.getErrorHistory();

      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 1');
      expect(history[1].message).toBe('Error 2');
    });

    it('should return empty array when no errors stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const history = errorLogger.getErrorHistory();

      expect(history).toEqual([]);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const history = errorLogger.getErrorHistory();

      expect(history).toEqual([]);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to parse error history:',
        expect.any(Error)
      );
    });

    it('should filter errors by type', () => {
      const mockErrors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'File error',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        },
        {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network error',
          timestamp: '2024-01-01T11:00:00Z',
          recoverable: false
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const fileErrors = errorLogger.getErrorHistory(ErrorType.FILE_NOT_FOUND);

      expect(fileErrors).toHaveLength(1);
      expect(fileErrors[0].type).toBe(ErrorType.FILE_NOT_FOUND);
    });

    it('should limit returned errors', () => {
      const mockErrors = Array.from({ length: 20 }, (_, i) => ({
        type: ErrorType.FILE_NOT_FOUND,
        message: `Error ${i}`,
        timestamp: `2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        recoverable: true
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const history = errorLogger.getErrorHistory(undefined, 10);

      expect(history).toHaveLength(10);
    });
  });

  describe('clearErrorHistory', () => {
    it('should clear all error history', () => {
      errorLogger.clearErrorHistory();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ebook-reader-errors');
      expect(mockConsole.info).toHaveBeenCalledWith('[ErrorLogger] Error history cleared');
    });

    it('should handle localStorage errors when clearing', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => errorLogger.clearErrorHistory()).not.toThrow();
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      const mockErrors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'Error 1',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        },
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'Error 2',
          timestamp: '2024-01-01T11:00:00Z',
          recoverable: false
        },
        {
          type: ErrorType.NETWORK_ERROR,
          message: 'Error 3',
          timestamp: '2024-01-01T12:00:00Z',
          recoverable: true
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const stats = errorLogger.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.recoverableErrors).toBe(2);
      expect(stats.errorsByType[ErrorType.FILE_NOT_FOUND]).toBe(2);
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(1);
      expect(stats.recentErrors).toBe(3); // All errors are from today
    });

    it('should handle empty error history', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const stats = errorLogger.getErrorStats();

      expect(stats.totalErrors).toBe(0);
      expect(stats.recoverableErrors).toBe(0);
      expect(stats.errorsByType).toEqual({});
      expect(stats.recentErrors).toBe(0);
    });
  });

  describe('exportErrorHistory', () => {
    it('should export error history as JSON', () => {
      const mockErrors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'Error 1',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const exported = errorLogger.exportErrorHistory();

      expect(exported).toContain('"type": "FILE_NOT_FOUND"');
      expect(exported).toContain('"message": "Error 1"');
    });

    it('should export empty array when no errors', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const exported = errorLogger.exportErrorHistory();

      expect(exported).toBe('[]');
    });
  });

  describe('importErrorHistory', () => {
    it('should import error history from JSON', () => {
      const importData = JSON.stringify([
        {
          type: ErrorType.PARSE_ERROR,
          message: 'Imported error',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        }
      ]);

      const result = errorLogger.importErrorHistory(importData);

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle invalid import data', () => {
      const result = errorLogger.importErrorHistory('invalid json');

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to import error history:',
        expect.any(Error)
      );
    });

    it('should merge with existing errors', () => {
      const existingErrors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          message: 'Existing error',
          timestamp: '2024-01-01T09:00:00Z',
          recoverable: true
        }
      ];

      const importData = JSON.stringify([
        {
          type: ErrorType.PARSE_ERROR,
          message: 'Imported error',
          timestamp: '2024-01-01T10:00:00Z',
          recoverable: true
        }
      ]);

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingErrors));

      const result = errorLogger.importErrorHistory(importData);

      expect(result).toBe(true);
      
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const mergedErrors = JSON.parse(setItemCall[1]);
      expect(mergedErrors).toHaveLength(2);
    });
  });
});