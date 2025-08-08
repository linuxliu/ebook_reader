import React from 'react';

/**
 * 高亮搜索结果的工具函数
 * @param text 要高亮的文本
 * @param searchQuery 搜索关键词
 * @returns 包含高亮标记的 React 元素
 */
export const highlightSearchText = (text: string, searchQuery: string): React.ReactNode => {
  if (!searchQuery.trim()) {
    return text;
  }

  const query = searchQuery.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  
  // 找到所有匹配的位置
  const matches: Array<{ start: number; end: number }> = [];
  let index = 0;
  
  while (index < lowerText.length) {
    const matchIndex = lowerText.indexOf(query, index);
    if (matchIndex === -1) break;
    
    matches.push({
      start: matchIndex,
      end: matchIndex + query.length
    });
    
    index = matchIndex + query.length;
  }

  if (matches.length === 0) {
    return text;
  }

  // 构建高亮的文本片段
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // 添加匹配前的普通文本
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start));
    }

    // 添加高亮的匹配文本
    parts.push(
      <mark
        key={`highlight-${i}`}
        className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-white px-0.5 rounded"
      >
        {text.slice(match.start, match.end)}
      </mark>
    );

    lastIndex = match.end;
  });

  // 添加最后剩余的普通文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};

/**
 * 检查文本是否包含搜索关键词
 * @param text 要检查的文本
 * @param searchQuery 搜索关键词
 * @returns 是否匹配
 */
export const matchesSearchQuery = (text: string, searchQuery: string): boolean => {
  if (!searchQuery.trim()) {
    return true;
  }

  const query = searchQuery.trim().toLowerCase();
  return text.toLowerCase().includes(query);
};

/**
 * 多字段搜索匹配
 * @param fields 要搜索的字段数组
 * @param searchQuery 搜索关键词
 * @returns 是否有任何字段匹配
 */
export const matchesAnyField = (fields: string[], searchQuery: string): boolean => {
  if (!searchQuery.trim()) {
    return true;
  }

  return fields.some(field => matchesSearchQuery(field, searchQuery));
};