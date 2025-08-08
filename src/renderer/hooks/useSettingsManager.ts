import { useState, useEffect, useCallback } from 'react';
import { ReadingSettings, AppSettings } from '../../shared/types';
import { useAppContext } from '../store/context';
import { ActionType } from '../store/types';

interface SettingsManagerOptions {
  bookId: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface SettingsManager {
  settings: ReadingSettings;
  appSettings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  updateSettings: (updates: Partial<ReadingSettings>) => Promise<void>;
  updateAppSettings: (updates: Partial<AppSettings>) => Promise<void>;
  saveSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  loadSettings: () => Promise<void>;
  getSettingsHistory: () => ReadingSettings[];
  restoreFromHistory: (settings: ReadingSettings) => Promise<void>;
}

// 默认设置
const DEFAULT_READING_SETTINGS: Omit<ReadingSettings, 'bookId'> = {
  fontFamily: 'SimSun, serif',
  fontSize: 16,
  lineHeight: 1.6,
  margin: 20,
  theme: 'light',
  pageMode: 'pagination'
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  autoSave: true,
  cacheSize: 500 // MB
};

// 设置版本管理
const SETTINGS_VERSION = '1.0.0';

interface VersionedSettings {
  version: string;
  settings: ReadingSettings;
  timestamp: Date;
}

export const useSettingsManager = (options: SettingsManagerOptions): SettingsManager => {
  const { bookId, autoSave = true, autoSaveDelay = 2000 } = options;
  const { state, dispatch } = useAppContext();
  
  const [settings, setSettings] = useState<ReadingSettings>({
    bookId,
    ...DEFAULT_READING_SETTINGS
  });
  
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [settingsHistory, setSettingsHistory] = useState<ReadingSettings[]>([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // 从 IPC 加载设置
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // 加载书籍特定设置
      const bookSettings = await window.electronAPI.invoke('settings:get', { bookId });
      if (bookSettings) {
        const migratedSettings = migrateSettings(bookSettings);
        setSettings(migratedSettings);
      } else {
        // 如果没有保存的设置，使用默认设置
        setSettings({
          bookId,
          ...DEFAULT_READING_SETTINGS
        });
      }

      // 加载应用全局设置
      const globalSettings = await window.electronAPI.invoke('settings:get-app');
      if (globalSettings) {
        setAppSettings(globalSettings);
      } else {
        setAppSettings(DEFAULT_APP_SETTINGS);
      }

      // 加载设置历史
      const history = await loadSettingsHistory(bookId);
      setSettingsHistory(history);

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // 使用默认设置作为后备
      setSettings({
        bookId,
        ...DEFAULT_READING_SETTINGS
      });
      setAppSettings(DEFAULT_APP_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  // 保存设置到 IPC
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      // 保存书籍特定设置
      await window.electronAPI.invoke('settings:save', {
        bookId,
        settings
      });

      // 保存应用全局设置
      await window.electronAPI.invoke('settings:save-app', {
        settings: appSettings
      });

      // 保存到历史记录
      await saveToHistory(settings);

      // 更新全局状态
      dispatch({
        type: ActionType.SET_APP_SETTINGS,
        payload: appSettings
      });

      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [bookId, settings, appSettings, dispatch]);

  // 更新阅读设置
  const updateSettings = useCallback(async (updates: Partial<ReadingSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setHasUnsavedChanges(true);

    // 清除之前的自动保存定时器
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // 如果启用自动保存，设置新的定时器
    if (autoSave) {
      const timer = setTimeout(async () => {
        try {
          // 保存书籍特定设置
          await window.electronAPI.invoke('settings:save', {
            bookId,
            settings: newSettings
          });

          // 保存应用全局设置
          await window.electronAPI.invoke('settings:save-app', {
            settings: appSettings
          });

          // 保存到历史记录
          await saveToHistory(newSettings);

          // 更新全局状态
          dispatch({
            type: ActionType.SET_APP_SETTINGS,
            payload: appSettings
          });

          setHasUnsavedChanges(false);
          setLastSaveTime(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, autoSaveDelay);
      setAutoSaveTimer(timer);
    }
  }, [settings, autoSave, autoSaveDelay, autoSaveTimer, bookId, appSettings, dispatch]);

  // 更新应用设置
  const updateAppSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newAppSettings = { ...appSettings, ...updates };
    setAppSettings(newAppSettings);
    setHasUnsavedChanges(true);

    // 如果启用自动保存，立即保存应用设置
    if (autoSave) {
      try {
        await window.electronAPI.invoke('settings:save-app', {
          settings: newAppSettings
        });
        
        dispatch({
          type: ActionType.SET_APP_SETTINGS,
          payload: newAppSettings
        });
        
        setHasUnsavedChanges(false);
        setLastSaveTime(new Date());
      } catch (error) {
        console.error('Failed to save app settings:', error);
      }
    }
  }, [appSettings, autoSave, dispatch]);

  // 重置为默认设置
  const resetToDefaults = useCallback(async () => {
    const defaultSettings: ReadingSettings = {
      bookId,
      ...DEFAULT_READING_SETTINGS
    };
    
    setSettings(defaultSettings);
    setHasUnsavedChanges(true);

    if (autoSave) {
      try {
        await saveSettings();
      } catch (error) {
        console.error('Failed to save default settings:', error);
      }
    }
  }, [bookId, autoSave, saveSettings]);

  // 获取设置历史
  const getSettingsHistory = useCallback(() => {
    return settingsHistory;
  }, [settingsHistory]);

  // 从历史记录恢复设置
  const restoreFromHistory = useCallback(async (historicalSettings: ReadingSettings) => {
    setSettings(historicalSettings);
    setHasUnsavedChanges(true);

    if (autoSave) {
      try {
        await saveSettings();
      } catch (error) {
        console.error('Failed to restore settings from history:', error);
      }
    }
  }, [autoSave, saveSettings]);

  // 设置版本迁移
  const migrateSettings = (settings: any): ReadingSettings => {
    // 如果没有版本信息，假设是旧版本
    if (!settings.version) {
      return {
        bookId,
        fontFamily: settings.fontFamily || DEFAULT_READING_SETTINGS.fontFamily,
        fontSize: settings.fontSize || DEFAULT_READING_SETTINGS.fontSize,
        lineHeight: settings.lineHeight || DEFAULT_READING_SETTINGS.lineHeight,
        margin: settings.margin || DEFAULT_READING_SETTINGS.margin,
        theme: settings.theme || DEFAULT_READING_SETTINGS.theme,
        pageMode: settings.pageMode || DEFAULT_READING_SETTINGS.pageMode
      };
    }

    // 根据版本进行迁移
    switch (settings.version) {
      case '1.0.0':
        return settings;
      default:
        // 未知版本，使用默认设置
        console.warn(`Unknown settings version: ${settings.version}, using defaults`);
        return {
          bookId,
          ...DEFAULT_READING_SETTINGS
        };
    }
  };

  // 保存设置到历史记录
  const saveToHistory = async (settings: ReadingSettings) => {
    try {
      const versionedSettings: VersionedSettings = {
        version: SETTINGS_VERSION,
        settings,
        timestamp: new Date()
      };

      const historyKey = `settings_history_${bookId}`;
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      // 限制历史记录数量（最多保存10个）
      const newHistory = [versionedSettings, ...existingHistory].slice(0, 10);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      
      setSettingsHistory(newHistory.map(h => h.settings));
    } catch (error) {
      console.error('Failed to save settings history:', error);
    }
  };

  // 加载设置历史记录
  const loadSettingsHistory = async (bookId: string): Promise<ReadingSettings[]> => {
    try {
      const historyKey = `settings_history_${bookId}`;
      const historyData = localStorage.getItem(historyKey);
      
      if (historyData) {
        const history: VersionedSettings[] = JSON.parse(historyData);
        return history.map(h => h.settings);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to load settings history:', error);
      return [];
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // 当书籍ID变化时重新加载设置
  useEffect(() => {
    if (bookId !== settings.bookId) {
      loadSettings();
    }
  }, [bookId, settings.bookId, loadSettings]);

  return {
    settings,
    appSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    lastSaveTime,
    updateSettings,
    updateAppSettings,
    saveSettings,
    resetToDefaults,
    loadSettings,
    getSettingsHistory,
    restoreFromHistory
  };
};