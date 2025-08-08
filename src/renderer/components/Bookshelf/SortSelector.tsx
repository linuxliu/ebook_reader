import React from 'react';
import { SortBy } from '../../../shared/types';

interface SortSelectorProps {
  value: SortBy;
  onChange: (sortBy: SortBy) => void;
}

const SortSelector: React.FC<SortSelectorProps> = ({ value, onChange }) => {
  const sortOptions = [
    { value: 'date' as SortBy, label: '导入时间', icon: '📅' },
    { value: 'title' as SortBy, label: '书名', icon: '📖' },
    { value: 'author' as SortBy, label: '作者', icon: '👤' }
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">排序:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="text-xs sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
        title="排序方式"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortSelector;