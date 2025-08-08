import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettingsManager } from '../useSettingsManager';
import { ReadingSettings, AppSettings } from '../../../shared/types';
import React from 'react';

// Mock the AppContext
const mockDispatch = jest.fn();
const mockState = {
  currentView: 'bookshelf' as const,
  books: [],
  currentBook: null,
  readingProgress: null,
  vocabulary: [],
  settings: {
    theme: 'system' as const,
    language: 'zh-CN' as const,
    autoSave: true,
    cacheSize: 500
  },
  theme: 'light' as const,
  loading: false,
  error: null
};

jest.mock('../../store/context', () => ({
  useAppContext: () => ({
    state: mockState,
    dispatch: mockDispatch
  })
}));

// Mock window.electronAPI
const mockElectronAPI = {
  invoke: jest.fn()
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock settings data
const mockReadingSettings: ReadingSettings = {
  bookId: 'test-book-1',
  fontFamily: 'SimSun, serif',
  fontSize: 16,
  lineHeight: 1.6,
  margin: 20,
  theme: 'light',
  pageMode: 'pagination'
};

const mockAppSettings: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  autoSave: true,
  cacheSize: 500
};

// Simple wrapper since we're mocking the context
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement('div', null, children);

describe('useSettingsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('initializes with default settings when no saved settings exist', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.bookId).toBe('test-book-1');
    expect(result.current.settings.fontFamily).toBe('SimSun, serif');
    expect(result.current.settings.fontSize).toBe(16);
  });

  it('loads saved settings from IPC', async () => {
    mockElectronAPI.invoke
      .mockResolvedValueOnce(mockReadingSettings) // settings:get
      .mockResolvedValueOnce(mockAppSettings); // settings:get-app

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockReadingSettings);
    expect(result.current.appSettings).toEqual(mockAppSettings);
  });

  it('updates settings and marks as unsaved', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1', autoSave: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSettings({ fontSize: 18 });
    });

    expect(result.current.settings.fontSize).toBe(18);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('auto-saves settings when enabled', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ 
        bookId: 'test-book-1', 
        autoSave: true, 
        autoSaveDelay: 100 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSettings({ fontSize: 18 });
    });

    // Wait for auto-save delay
    await waitFor(() => {
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('settings:save', {
        bookId: 'test-book-1',
        settings: expect.objectContaining({ fontSize: 18 })
      });
    }, { timeout: 200 });
  });

  it('saves settings manually', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1', autoSave: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSettings({ fontSize: 18 });
    });

    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mockElectronAPI.invoke).toHaveBeenCalledWith('settings:save', {
      bookId: 'test-book-1',
      settings: expect.objectContaining({ fontSize: 18 })
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.lastSaveTime).toBeInstanceOf(Date);
  });

  it('resets to default settings', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1', autoSave: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Change settings first
    await act(async () => {
      await result.current.updateSettings({ fontSize: 24, theme: 'dark' });
    });

    // Reset to defaults
    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(result.current.settings.fontSize).toBe(16);
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('updates app settings', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateAppSettings({ theme: 'dark' });
    });

    expect(mockElectronAPI.invoke).toHaveBeenCalledWith('settings:save-app', {
      settings: expect.objectContaining({ theme: 'dark' })
    });
  });

  it('handles settings history', async () => {
    const mockHistory = [
      { ...mockReadingSettings, fontSize: 14 },
      { ...mockReadingSettings, fontSize: 18 }
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(
      mockHistory.map(settings => ({
        version: '1.0.0',
        settings,
        timestamp: new Date()
      }))
    ));

    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const history = result.current.getSettingsHistory();
    expect(history).toHaveLength(2);
    expect(history[0].fontSize).toBe(14);
    expect(history[1].fontSize).toBe(18);
  });

  it('restores settings from history', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1', autoSave: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const historicalSettings = { ...mockReadingSettings, fontSize: 20 };

    await act(async () => {
      await result.current.restoreFromHistory(historicalSettings);
    });

    expect(result.current.settings.fontSize).toBe(20);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('migrates old settings format', async () => {
    const oldSettings = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      // Missing some new fields
    };

    mockElectronAPI.invoke
      .mockResolvedValueOnce(oldSettings)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.fontFamily).toBe('Arial, sans-serif');
    expect(result.current.settings.fontSize).toBe(18);
    expect(result.current.settings.lineHeight).toBe(1.6); // Default value
    expect(result.current.settings.theme).toBe('light'); // Default value
  });

  it('handles IPC errors gracefully', async () => {
    mockElectronAPI.invoke.mockRejectedValue(new Error('IPC Error'));

    const { result } = renderHook(
      () => useSettingsManager({ bookId: 'test-book-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to default settings
    expect(result.current.settings.fontFamily).toBe('SimSun, serif');
    expect(result.current.settings.fontSize).toBe(16);
  });

  it('reloads settings when bookId changes', async () => {
    mockElectronAPI.invoke.mockResolvedValue(null);

    const { result, rerender } = renderHook(
      ({ bookId }) => useSettingsManager({ bookId }),
      { 
        wrapper,
        initialProps: { bookId: 'book-1' }
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.bookId).toBe('book-1');

    // Change bookId
    rerender({ bookId: 'book-2' });

    await waitFor(() => {
      expect(result.current.settings.bookId).toBe('book-2');
    });
  });
});