import React from 'react';
import { ReadingSettings } from '../../../shared/types';

interface SettingsHistoryProps {
  history: ReadingSettings[];
  currentSettings: ReadingSettings;
  onRestore: (settings: ReadingSettings) => void;
  onClose: () => void;
  isVisible: boolean;
}

const SettingsHistory: React.FC<SettingsHistoryProps> = ({
  history,
  currentSettings,
  onRestore,
  onClose,
  isVisible
}) => {
  if (!isVisible) return null;

  const formatSettingsPreview = (settings: ReadingSettings) => {
    return `${settings.fontFamily.split(',')[0]} ${settings.fontSize}px, 行距${settings.lineHeight}, ${settings.theme === 'light' ? '浅色' : '深色'}主题`;
  };

  const isCurrentSettings = (settings: ReadingSettings) => {
    return (
      settings.fontFamily === currentSettings.fontFamily &&
      settings.fontSize === currentSettings.fontSize &&
      settings.lineHeight === currentSettings.lineHeight &&
      settings.margin === currentSettings.margin &&
      settings.theme === currentSettings.theme &&
      settings.pageMode === currentSettings.pageMode
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            设置历史
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>暂无设置历史记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((settings, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-colors ${
                    isCurrentSettings(settings)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        历史设置 #{index + 1}
                        {isCurrentSettings(settings) && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            (当前)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatSettingsPreview(settings)}
                      </div>
                    </div>
                    
                    {!isCurrentSettings(settings) && (
                      <button
                        onClick={() => onRestore(settings)}
                        className="ml-3 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        恢复
                      </button>
                    )}
                  </div>

                  {/* 详细设置信息 */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <div>字体: {settings.fontFamily.split(',')[0]}</div>
                      <div>字号: {settings.fontSize}px</div>
                      <div>行距: {settings.lineHeight}</div>
                      <div>边距: {settings.margin}px</div>
                      <div>主题: {settings.theme === 'light' ? '浅色' : '深色'}</div>
                      <div>模式: {settings.pageMode === 'pagination' ? '分页' : '滚动'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsHistory;