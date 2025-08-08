import React, { useState } from 'react';
import { VocabularyItem as VocabularyItemType } from '../../../shared/types';

interface VocabularyItemProps {
  item: VocabularyItemType;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMarkMastered: (mastered: boolean) => void;
  onEdit: () => void;
}

const VocabularyItem: React.FC<VocabularyItemProps> = ({
  item,
  selected,
  onSelect,
  onDelete,
  onMarkMastered,
  onEdit
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`确定要删除生词 "${item.word}" 吗？`)) {
      onDelete();
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`border-b hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="mt-1 mr-3"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900 mr-3">
                  {item.word}
                </h3>
                {item.pronunciation && (
                  <span className="text-sm text-gray-500 italic">
                    [{item.pronunciation}]
                  </span>
                )}
                <div className="ml-auto flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.mastered 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.mastered ? '已掌握' : '学习中'}
                  </span>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 mb-2">{item.translation}</p>
              
              <div className="text-sm text-gray-500">
                <span>添加时间：{formatDate(item.addedDate)}</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex items-center space-x-2">
            <button
              onClick={() => onMarkMastered(!item.mastered)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                item.mastered
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {item.mastered ? '标记未掌握' : '标记已掌握'}
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              编辑
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {item.example && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-1">例句：</h4>
                <p className="text-sm text-gray-600 italic">{item.example}</p>
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">上下文：</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {item.context}
              </p>
            </div>
            
            <div className="text-xs text-gray-400">
              <span>来源书籍ID：{item.bookId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyItem;