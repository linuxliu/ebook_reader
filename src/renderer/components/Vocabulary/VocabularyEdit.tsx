import React, { useState, useEffect } from 'react';
import { VocabularyItem } from '../../../shared/types';

interface VocabularyEditProps {
  item: VocabularyItem | null;
  visible: boolean;
  onSave: (item: VocabularyItem) => void;
  onCancel: () => void;
}

const VocabularyEdit: React.FC<VocabularyEditProps> = ({
  item,
  visible,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<VocabularyItem>>({
    word: '',
    translation: '',
    pronunciation: '',
    example: '',
    context: '',
    mastered: false
  });

  useEffect(() => {
    if (item) {
      setFormData({
        word: item.word,
        translation: item.translation,
        pronunciation: item.pronunciation || '',
        example: item.example || '',
        context: item.context,
        mastered: item.mastered
      });
    } else {
      setFormData({
        word: '',
        translation: '',
        pronunciation: '',
        example: '',
        context: '',
        mastered: false
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.word?.trim() || !formData.translation?.trim()) {
      alert('单词和翻译不能为空');
      return;
    }

    const updatedItem: VocabularyItem = {
      ...item!,
      word: formData.word!.trim(),
      translation: formData.translation!.trim(),
      pronunciation: formData.pronunciation?.trim(),
      example: formData.example?.trim(),
      context: formData.context!.trim(),
      mastered: formData.mastered!
    };

    onSave(updatedItem);
  }; 
 const handleInputChange = (field: keyof VocabularyItem, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {item ? '编辑生词' : '添加生词'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                单词 *
              </label>
              <input
                type="text"
                value={formData.word || ''}
                onChange={(e) => handleInputChange('word', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入单词"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                翻译 *
              </label>
              <input
                type="text"
                value={formData.translation || ''}
                onChange={(e) => handleInputChange('translation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入翻译"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发音
              </label>
              <input
                type="text"
                value={formData.pronunciation || ''}
                onChange={(e) => handleInputChange('pronunciation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入发音（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                例句
              </label>
              <textarea
                value={formData.example || ''}
                onChange={(e) => handleInputChange('example', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入例句（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上下文
              </label>
              <textarea
                value={formData.context || ''}
                onChange={(e) => handleInputChange('context', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入上下文"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="mastered"
                checked={formData.mastered || false}
                onChange={(e) => handleInputChange('mastered', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="mastered" className="text-sm text-gray-700">
                已掌握
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VocabularyEdit;