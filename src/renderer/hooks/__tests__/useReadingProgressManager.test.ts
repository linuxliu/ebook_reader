import { renderHook, act } from '@testing-library/react';
import { useReadingProgressManager } from '../useReadingProgressManager';
import { BookMetadata, ReadingProgress, ErrorType } from '../../../shared/types';
import { ipcClient } from '../../services/IPCClient';

// Mock dependencies
jest.mock('../../services/IPCClient');
jest.mock('../../store/hooks', () => ({
  useReadingProgress: () => ({
    readingProgress: null,
    setReadingProgress: jest.fn(),
    updateReadingProgress: jest.fn()
  }),
  useError: () => ({
    createError: jest.fn()
  })
}));

const mockIpcClient = ipcClient as jest.Mocked<typeof ipcClient>;

const mockBook: BookMetadata = {
  id: 'test-book-1',
  title: 'Test Book',
  author: 'Test Author',
  format: 'epub',
  filePath: '/test/path',
  fileSize: 1024000,
  importDate: new Date(),
  totalPages: 100,
  language: 'zh-CN'
};

const mockProgress: ReadingProgress = {
  bookId: 'test-book-1',
  currentPage: 50,
  currentChapter: 2,
  percentage: 50,
  position: 'page-50',
  lastUpdateTime: new Date()
};

describe('useReadingProgressManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Mock window properties for position detection
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
  });

  describe('loadProgress', () => {
    it('should load and validate progress data', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: true,
          enableBackup: true
        })
      );

      await act(async () => {
        const progress = await result.current.loadProgress();
        expect(progress).toBeDefined();
        expect(progress?.bookId).toBe(mockBook.id);
      });

      expect(mockIpcClient.getProgress).toHaveBeenCalledWith(mockBook.id);
    });

    it('should create initial progress when no progress exists', async () => {
      mockIpcClient.getProgress.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: true,
          enableBackup: true
        })
      );

      await act(async () => {
        const progress = await result.current.loadProgress();
        expect(progress).toBeDefined();
        expect(progress?.currentPage).toBe(1);
        expect(progress?.percentage).toBe(0);
        expect(progress?.bookId).toBe(mockBook.id);
      });
    });

    it('should handle corrupted progress data', async () => {
      const corruptedProgress = {
        ...mockProgress,
        currentPage: -1, // Invalid page
        percentage: 150 // Invalid percentage
      };
      mockIpcClient.getProgress.mockResolvedValue(corruptedProgress);

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: true,
          enableBackup: true
        })
      );

      await act(async () => {
        const progress = await result.current.loadProgress();
        expect(progress).toBeDefined();
        expect(progress?.currentPage).toBe(1); // Fixed to valid value
        expect(progress?.percentage).toBe(1); // Fixed to valid value
      });
    });
  });

  describe('saveProgress', () => {
    it('should save progress with debouncing', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);
      mockIpcClient.saveProgress.mockResolvedValue();

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          debounceDelay: 100
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.saveProgress({ currentPage: 60 });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(mockIpcClient.saveProgress).toHaveBeenCalled();
    });

    it('should auto-detect position when enabled', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);
      mockIpcClient.saveProgress.mockResolvedValue();

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: true,
          debounceDelay: 50
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.saveProgress({ currentPage: 60 });
      });

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockIpcClient.saveProgress).toHaveBeenCalledWith(
        mockBook.id,
        expect.objectContaining({
          currentPage: 60,
          position: expect.any(String)
        })
      );
    });
  });

  describe('resetProgress', () => {
    it('should reset progress to initial state', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);
      mockIpcClient.deleteProgress.mockResolvedValue();

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.resetProgress();
      });

      expect(mockIpcClient.deleteProgress).toHaveBeenCalledWith(mockBook.id);
    });
  });

  describe('backupProgress', () => {
    it('should backup progress to history', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableBackup: true
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.backupProgress();
      });

      const history = result.current.getProgressHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should store backup in localStorage', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableBackup: true
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.backupProgress();
      });

      const backupKey = `progress_backup_${mockBook.id}`;
      const stored = localStorage.getItem(backupKey);
      expect(stored).toBeTruthy();
      
      const parsedBackup = JSON.parse(stored!);
      expect(Array.isArray(parsedBackup)).toBe(true);
    });
  });

  describe('restoreProgress', () => {
    it('should restore progress from backup', async () => {
      mockIpcClient.saveProgress.mockResolvedValue();

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableBackup: true
        })
      );

      const backupProgress = {
        ...mockProgress,
        currentPage: 75,
        percentage: 75
      };

      await act(async () => {
        await result.current.restoreProgress(backupProgress);
      });

      expect(mockIpcClient.saveProgress).toHaveBeenCalledWith(
        mockBook.id,
        backupProgress
      );
    });

    it('should reject invalid backup data', async () => {
      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableBackup: true
        })
      );

      const invalidBackup = {
        ...mockProgress,
        currentPage: -1, // Invalid
        bookId: '' // Invalid
      };

      await expect(
        act(async () => {
          await result.current.restoreProgress(invalidBackup);
        })
      ).rejects.toThrow();
    });
  });

  describe('detectCurrentPosition', () => {
    it('should detect scroll position', () => {
      // Mock scroll position
      Object.defineProperty(window, 'pageYOffset', { value: 500 });
      Object.defineProperty(document.documentElement, 'scrollTop', { value: 500 });

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: true
        })
      );

      const position = result.current.detectCurrentPosition();
      expect(position).toContain('scroll:');
      expect(position).toContain('%');
    });

    it('should return current position when auto-detection disabled', () => {
      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          enableAutoDetection: false
        })
      );

      const position = result.current.detectCurrentPosition();
      expect(position).toBe('page-1'); // Default fallback
    });
  });

  describe('isValidProgress', () => {
    it('should validate correct progress data', () => {
      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook
        })
      );

      const isValid = result.current.isValidProgress(mockProgress);
      expect(isValid).toBe(true);
    });

    it('should reject invalid progress data', () => {
      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook
        })
      );

      const invalidProgress = {
        ...mockProgress,
        currentPage: -1,
        percentage: 150,
        bookId: ''
      };

      const isValid = result.current.isValidProgress(invalidProgress);
      expect(isValid).toBe(false);
    });

    it('should reject progress with invalid timestamp', () => {
      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook
        })
      );

      const invalidProgress = {
        ...mockProgress,
        lastUpdateTime: new Date('invalid-date')
      };

      const isValid = result.current.isValidProgress(invalidProgress);
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle IPC errors gracefully', async () => {
      mockIpcClient.getProgress.mockRejectedValue(new Error('IPC Error'));

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook
        })
      );

      await act(async () => {
        const progress = await result.current.loadProgress();
        // Should return fallback progress
        expect(progress).toBeDefined();
        expect(progress?.currentPage).toBe(1);
      });
    });

    it('should handle save errors', async () => {
      mockIpcClient.getProgress.mockResolvedValue(mockProgress);
      mockIpcClient.saveProgress.mockRejectedValue(new Error('Save Error'));

      const { result } = renderHook(() =>
        useReadingProgressManager({
          book: mockBook,
          debounceDelay: 50
        })
      );

      await act(async () => {
        await result.current.loadProgress();
      });

      await act(async () => {
        await result.current.saveProgress({ currentPage: 60 });
      });

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should maintain unsaved changes state
      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });
});