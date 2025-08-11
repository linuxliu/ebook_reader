import React, { useState } from 'react';
import { TableOfContent } from '../../../shared/types';

interface TableOfContentsProps {
  toc: TableOfContent[];
  currentPage: number;
  isVisible: boolean;
  onToggle: () => void;
  onChapterSelect: (page: number) => void;
  onClose?: () => void; // 新增关闭回调
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  toc,
  currentPage,
  isVisible,
  onToggle,
  onChapterSelect,
  onClose
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isCurrentChapter = (item: TableOfContent) => {
    // Check if current page is within this chapter
    const nextItem = toc.find(tocItem => tocItem.page > item.page);
    const endPage = nextItem ? nextItem.page - 1 : Infinity;
    return currentPage >= item.page && currentPage <= endPage;
  };

  const renderTocItem = (item: TableOfContent, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isCurrent = isCurrentChapter(item);
    const indentClass = `ml-${Math.min(depth * 4, 16)}`;

    return (
      <div key={item.id} className="toc-item">
        <div
          className={`
            flex items-center py-2 px-3 cursor-pointer rounded-lg transition-colors
            ${isCurrent 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
            ${indentClass}
          `}
          onClick={() => onChapterSelect(item.page)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <svg 
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`
                text-sm truncate
                ${item.level === 1 ? 'font-medium' : 'font-normal'}
              `}>
                {item.title}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                {item.page}
              </span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="toc-children">
            {item.children!.map(child => renderTocItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          目录
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="隐藏目录"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {toc.length > 0 ? (
          <div className="space-y-1">
            {toc.map(item => renderTocItem(item))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">暂无目录</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with current position */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          当前位置：第 {currentPage} 页
        </div>
      </div>
    </div>
  );
};

export default TableOfContents;