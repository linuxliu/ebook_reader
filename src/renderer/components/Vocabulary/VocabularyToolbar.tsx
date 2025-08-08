import React from 'react';

type SortBy = 'date' | 'alphabetical' | 'mastered';
type FilterMastered = 'all' | 'mastered' | 'unmastered';

interface VocabularyToolbarProps {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  filterMastered: FilterMastered;
  onFilterChange: (filter: FilterMastered) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  onExport: (format: 'csv' | 'txt') => void;
  onOpenExportDialog: () => void;
  onBatchDelete: () => void;
  onBatchMarkMastered: (mastered: boolean) => void;
}

const VocabularyToolbar: React.FC<VocabularyToolbarProps> = ({
  sortBy,
  onSortChange,
  filterMastered,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  onExport,
  onOpenExportDialog,
  onBatchDelete,
  onBatchMarkMastered
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-col space-y-4">
        {/* 第一行：搜索和统计 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索生词..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="text-sm text-gray-600">
              共 {totalCount} 个生词
              {selectedCount > 0 && (
                <span className="ml-2 text-blue-600">
                  已选择 {selectedCount} 个
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenExportDialog}
              className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
            >
              导出生词表
            </button>
          </div>
        </div>
        
        {/* 第二行：过滤和排序 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">排序：</label>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortBy)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">按时间</option>
                <option value="alphabetical">按字母</option>
                <option value="mastered">按掌握状态</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">筛选：</label>
              <select
                value={filterMastered}
                onChange={(e) => onFilterChange(e.target.value as FilterMastered)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部</option>
                <option value="unmastered">学习中</option>
                <option value="mastered">已掌握</option>
              </select>
            </div>
          </div>
          
          {/* 批量操作 */}
          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">批量操作：</span>
              <button
                onClick={() => onBatchMarkMastered(true)}
                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
              >
                标记已掌握
              </button>
              <button
                onClick={() => onBatchMarkMastered(false)}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
              >
                标记未掌握
              </button>
              <button
                onClick={onBatchDelete}
                className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
              >
                批量删除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyToolbar;