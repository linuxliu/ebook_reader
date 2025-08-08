import React, { useState, useCallback } from 'react';
import { ReadingSettings, AppSettings } from '../../../shared/types';
import SettingsPanel from './SettingsPanel';
import SettingsHistory from './SettingsHistory';
import { useSettingsManager } from '../../hooks/useSettingsManager';

interface EnhancedSettingsPanelProps {
  bookId: string;
  onClose: () => void;
  showPreview?: boolean;
}

const EnhancedSettingsPanel: React.FC<EnhancedSettingsPanelProps> = ({
  bookId,
  onClose,
  showPreview = true
}) => {
  const [showHistory, setShowHistory] = useState(false);
  
  const settingsManager = useSettingsManager({
    bookId,
    autoSave: true,
    autoSaveDelay: 2000
  });

  const {
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
    getSettingsHistory,
    restoreFromHistory
  } = settingsManager;

  // 处理设置变化
  const handleSettingsChange = useCallback(async (newSettings: ReadingSettings) => {
    try {
      await updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, [updateSettings]);

  // 处理应用设置变化
  const handleAppSettingsChange = useCallback(async (newAppSettings: AppSettings) => {
    try {
      await updateAppSettings(newAppSettings);
    } catch (error) {
      console.error('Failed to update app settings:', error);
    }
  }, [updateAppSettings]);

  // 手动保存设置
  const handleManualSave = useCallback(async () => {
    try {
      await saveSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      // 可以显示错误提示
    }
  }, [saveSettings]);

  // 重置为默认设置
  const handleReset = useCallback(async () => {
    if (window.confirm('确定要重置为默认设置吗？这将清除当前的所有自定义设置。')) {
      try {
        await resetToDefaults();
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  }, [resetToDefaults]);

  // 显示设置历史
  const handleShowHistory = useCallback(() => {
    setShowHistory(true);
  }, []);

  // 从历史恢复设置
  const handleRestoreFromHistory = useCallback(async (historicalSettings: ReadingSettings) => {
    try {
      await restoreFromHistory(historicalSettings);
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to restore settings from history:', error);
    }
  }, [restoreFromHistory]);

  // 关闭面板前检查未保存的更改
  const handleClose = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('您有未保存的设置更改，是否要保存？');
      if (shouldSave) {
        try {
          await saveSettings();
        } catch (error) {
          console.error('Failed to save settings before closing:', error);
        }
      }
    }
    onClose();
  }, [hasUnsavedChanges, saveSettings, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">加载设置中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="settings-panel fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header with status indicators */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                阅读设置
              </h2>
              
              {/* Status indicators */}
              <div className="flex items-center space-x-2">
                {isSaving && (
                  <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                    <span className="text-xs">保存中...</span>
                  </div>
                )}
                
                {hasUnsavedChanges && !isSaving && (
                  <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <span className="text-xs">有未保存更改</span>
                  </div>
                )}
                
                {!hasUnsavedChanges && !isSaving && lastSaveTime && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <span className="text-xs">已保存</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Settings history button */}
              {getSettingsHistory().length > 0 && (
                <button
                  onClick={handleShowHistory}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="查看设置历史"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              
              {/* Manual save button */}
              {hasUnsavedChanges && (
                <button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                  title="手动保存设置"
                >
                  保存
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Render the actual settings panel content */}
          <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onClose={handleClose}
            showPreview={showPreview}
          />
          
          {/* Additional footer with enhanced controls */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
              >
                重置默认
              </button>
              
              {getSettingsHistory().length > 0 && (
                <button
                  onClick={handleShowHistory}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
                >
                  查看历史
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                完成
              </button>
            </div>
            
            {/* Status information */}
            {lastSaveTime && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                上次保存: {lastSaveTime.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings History Modal */}
      <SettingsHistory
        history={getSettingsHistory()}
        currentSettings={settings}
        onRestore={handleRestoreFromHistory}
        onClose={() => setShowHistory(false)}
        isVisible={showHistory}
      />
    </>
  );
};

export default EnhancedSettingsPanel;