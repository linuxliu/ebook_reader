import React, { useState } from 'react';

interface VocabularyExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'txt', options?: ExportOptions) => void;
  totalCount: number;
}

interface ExportOptions {
  includeContext: boolean;
  includeExample: boolean;
  includePronunciation: boolean;
  onlyMastered: boolean;
  onlyUnmastered: boolean;
}

const VocabularyExport: React.FC<VocabularyExportProps> = ({
  isOpen,
  onClose,
  onExport,
  totalCount
}) => {
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');
  const [options, setOptions] = useState<ExportOptions>({
    includeContext: true,
    includeExample: true,
    includePronunciation: true,
    onlyMastered: false,
    onlyUnmastered: false
  });

  const handleExport = () => {
    onExport(format, options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">导出生词表</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'csv')}
                  className="mr-2"
                />
                <span className="text-sm">CSV 格式（适合 Excel 打开）</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="txt"
                  checked={format === 'txt'}
                  onChange={(e) => setFormat(e.target.value as 'txt')}
                  className="mr-2"
                />
                <span className="text-sm">TXT 格式（纯文本）</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出内容
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeContext}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeContext: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">包含上下文</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeExample}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeExample: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">包含例句</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includePronunciation}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePronunciation: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">包含发音</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              筛选条件
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.onlyMastered}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    onlyMastered: e.target.checked,
                    onlyUnmastered: e.target.checked ? false : prev.onlyUnmastered
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">仅导出已掌握的生词</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.onlyUnmastered}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    onlyUnmastered: e.target.checked,
                    onlyMastered: e.target.checked ? false : prev.onlyMastered
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">仅导出未掌握的生词</span>
              </label>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            将导出 {totalCount} 个生词
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabularyExport;