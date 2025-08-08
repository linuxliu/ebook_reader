import React, { useState, useCallback } from 'react';
import { ReadingSettings } from '../../../shared/types';

interface SettingsPanelProps {
  settings: ReadingSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
  onClose: () => void;
  showPreview?: boolean;
}

// 可用字体列表
const AVAILABLE_FONTS = [
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'system-ui, sans-serif', label: '系统默认' }
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose,
  showPreview = true
}) => {
  const [localSettings, setLocalSettings] = useState<ReadingSettings>(settings);

  // 处理字体选择变化
  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    const newSettings = { ...localSettings, fontFamily };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 处理字号变化 (12px-32px, 步长2px)
  const handleFontSizeChange = useCallback((fontSize: number) => {
    const newSettings = { ...localSettings, fontSize };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 处理行间距变化
  const handleLineHeightChange = useCallback((lineHeight: number) => {
    const newSettings = { ...localSettings, lineHeight };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 处理边距变化
  const handleMarginChange = useCallback((margin: number) => {
    const newSettings = { ...localSettings, margin };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 处理主题变化
  const handleThemeChange = useCallback((theme: 'light' | 'dark') => {
    const newSettings = { ...localSettings, theme };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 处理页面模式变化
  const handlePageModeChange = useCallback((pageMode: 'scroll' | 'pagination') => {
    const newSettings = { ...localSettings, pageMode };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // 重置为默认设置
  const handleReset = useCallback(() => {
    const defaultSettings: ReadingSettings = {
      bookId: settings.bookId,
      fontFamily: 'SimSun, serif',
      fontSize: 16,
      lineHeight: 1.6,
      margin: 20,
      theme: 'light',
      pageMode: 'pagination'
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  }, [settings.bookId, onSettingsChange]);

  return (
    <div className="settings-panel fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            阅读设置
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {/* Settings Controls */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* 字体选择 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                字体
              </label>
              <select
                value={localSettings.fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 字号调整 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                字号: {localSettings.fontSize}px
              </label>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">12px</span>
                <input
                  type="range"
                  min="12"
                  max="32"
                  step="2"
                  value={localSettings.fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="字号"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">32px</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>较小</span>
                <span>适中</span>
                <span>较大</span>
              </div>
            </div>

            {/* 行间距调整 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                行间距: {localSettings.lineHeight}
              </label>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">1.0</span>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={localSettings.lineHeight}
                  onChange={(e) => handleLineHeightChange(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="行间距"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">3.0</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>紧密</span>
                <span>适中</span>
                <span>宽松</span>
              </div>
            </div>

            {/* 边距调整 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                页面边距: {localSettings.margin}px
              </label>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">10px</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={localSettings.margin}
                  onChange={(e) => handleMarginChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="页面边距"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">60px</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>窄</span>
                <span>适中</span>
                <span>宽</span>
              </div>
            </div>

            {/* 主题选择 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                主题
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    localSettings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">浅色</span>
                  </div>
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    localSettings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-gray-800 border border-gray-600 rounded"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">深色</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 页面模式 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                阅读模式
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handlePageModeChange('pagination')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    localSettings.pageMode === 'pagination'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">分页模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">翻页阅读</div>
                  </div>
                </button>
                <button
                  onClick={() => handlePageModeChange('scroll')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    localSettings.pageMode === 'scroll'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">滚动模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">连续滚动</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                重置默认
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                完成
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">预览效果</h3>
              </div>
              <div 
                className="p-4 h-full overflow-y-auto"
                style={{
                  fontFamily: localSettings.fontFamily,
                  fontSize: `${localSettings.fontSize}px`,
                  lineHeight: localSettings.lineHeight,
                  margin: `${localSettings.margin}px`,
                  backgroundColor: localSettings.theme === 'dark' ? '#1f2937' : '#ffffff',
                  color: localSettings.theme === 'dark' ? '#f9fafb' : '#111827'
                }}
              >
                <h4 className="font-bold mb-4">示例文本</h4>
                <p className="mb-4">
                  这是一段示例文本，用于预览当前的字体和排版设置效果。您可以通过调整左侧的设置选项来实时查看文本的显示效果。
                </p>
                <p className="mb-4">
                  在这里您可以看到字体、字号、行间距和边距的实际效果。不同的设置组合会产生不同的阅读体验，请选择最适合您的设置。
                </p>
                <p>
                  The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is commonly used for font testing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;