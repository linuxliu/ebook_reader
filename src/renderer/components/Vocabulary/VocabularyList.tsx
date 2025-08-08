import React, { useState, useMemo, useCallback } from 'react';
import { VocabularyItem as VocabularyItemType } from '../../../shared/types';
import VocabularyItem from './VocabularyItem';
import VocabularyToolbar from './VocabularyToolbar';
import { VirtualList } from '../common/VirtualList';

interface VocabularyListProps {
  vocabulary: VocabularyItemType[];
  loading?: boolean;
  onDelete: (wordId: string) => void;
  onMarkMastered: (wordId: string, mastered: boolean) => void;
  onExport: (format: 'csv' | 'txt') => void;
  onOpenExportDialog: () => void;
  onEdit: (word: VocabularyItemType) => void;
  containerHeight?: number;
  enableVirtualization?: boolean;
}

interface VirtualVocabularyItem extends VocabularyItemType {
  id: string;
}

type SortBy = 'date' | 'alphabetical' | 'mastered';

const VocabularyList: React.FC<VocabularyListProps> = React.memo(({
  vocabulary,
  loading = false,
  onDelete,
  onMarkMastered,
  onExport,
  onOpenExportDialog,
  onEdit,
  containerHeight = 600,
  enableVirtualization = true
}) => {
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterMastered, setFilterMastered] = useState<'all' | 'mastered' | 'unmastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const itemsPerPage = 20;

  // 过滤和排序词汇
  const filteredAndSortedVocabulary = useMemo(() => {
    let filtered = vocabulary;

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.word.toLowerCase().includes(query) ||
        item.translation.toLowerCase().includes(query) ||
        item.context.toLowerCase().includes(query)
      );
    }

    // 掌握状态过滤
    if (filterMastered !== 'all') {
      filtered = filtered.filter(item =>
        filterMastered === 'mastered' ? item.mastered : !item.mastered
      );
    }

    // 排序
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        case 'alphabetical':
          return a.word.localeCompare(b.word);
        case 'mastered':
          if (a.mastered === b.mastered) {
            return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
          }
          return a.mastered ? 1 : -1;
        default:
          return 0;
      }
    });

    return sorted;
  }, [vocabulary, sortBy, filterMastered, searchQuery]);

  // 分页
  const totalPages = Math.ceil(filteredAndSortedVocabulary.length / itemsPerPage);
  const paginatedVocabulary = filteredAndSortedVocabulary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedVocabulary.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedVocabulary.map(item => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBatchDelete = () => {
    if (selectedItems.size === 0) return;
    
    if (window.confirm(`确定要删除选中的 ${selectedItems.size} 个生词吗？`)) {
      selectedItems.forEach(itemId => onDelete(itemId));
      setSelectedItems(new Set());
    }
  };

  const handleBatchMarkMastered = useCallback((mastered: boolean) => {
    if (selectedItems.size === 0) return;
    
    selectedItems.forEach(itemId => onMarkMastered(itemId, mastered));
    setSelectedItems(new Set());
  }, [selectedItems, onMarkMastered]);

  // Virtual list render function
  const renderVirtualItem = useCallback((item: VirtualVocabularyItem, index: number, style: React.CSSProperties) => {
    return (
      <div style={{ ...style, padding: '4px 0' }}>
        <VocabularyItem
          item={item}
          selected={selectedItems.has(item.id)}
          onSelect={() => handleSelectItem(item.id)}
          onDelete={() => onDelete(item.id)}
          onMarkMastered={(mastered: boolean) => onMarkMastered(item.id, mastered)}
          onEdit={() => onEdit(item)}
        />
      </div>
    );
  }, [selectedItems, onDelete, onMarkMastered, onEdit]);

  // Convert to virtual items
  const virtualItems = useMemo((): VirtualVocabularyItem[] => {
    return paginatedVocabulary.map(item => ({ ...item, id: item.id }));
  }, [paginatedVocabulary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <VocabularyToolbar
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterMastered={filterMastered}
        onFilterChange={setFilterMastered}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedItems.size}
        totalCount={vocabulary.length}
        onExport={onExport}
        onOpenExportDialog={onOpenExportDialog}
        onBatchDelete={handleBatchDelete}
        onBatchMarkMastered={handleBatchMarkMastered}
      />

      <div className="flex-1 overflow-hidden">
        {filteredAndSortedVocabulary.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-lg font-medium mb-2">暂无生词</p>
            <p className="text-sm">在阅读时选中单词并添加到生词表</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.size === paginatedVocabulary.length && paginatedVocabulary.length > 0}
                onChange={handleSelectAll}
                className="mr-3"
              />
              <span className="text-sm text-gray-600">
                显示 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedVocabulary.length)} 
                / 共 {filteredAndSortedVocabulary.length} 个生词
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              {enableVirtualization && paginatedVocabulary.length > 20 ? (
                <VirtualList
                  items={virtualItems}
                  itemHeight={120} // Estimated height for vocabulary item
                  containerHeight={containerHeight - 200} // Account for toolbar and pagination
                  renderItem={renderVirtualItem}
                  overscan={5}
                  className="vocabulary-virtual-list"
                />
              ) : (
                <div className="overflow-y-auto h-full">
                  {paginatedVocabulary.map((item) => (
                    <VocabularyItem
                      key={item.id}
                      item={item}
                      selected={selectedItems.has(item.id)}
                      onSelect={() => handleSelectItem(item.id)}
                      onDelete={() => onDelete(item.id)}
                      onMarkMastered={(mastered: boolean) => onMarkMastered(item.id, mastered)}
                      onEdit={() => onEdit(item)}
                    />
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="mx-4 text-sm text-gray-600">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">跳转到</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm border rounded-md text-center"
                  />
                  <span className="text-sm text-gray-600">页</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default VocabularyList;