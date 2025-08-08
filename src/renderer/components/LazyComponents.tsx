import React from 'react';

// 直接导入组件，避免代码分割
import Bookshelf from './Bookshelf/Bookshelf';
import Reader from './Reader/Reader';
import Vocabulary from './Vocabulary/Vocabulary';
import SettingsPanel from './Settings/SettingsPanel';

// 导出组件（保持原有的命名以兼容现有代码）
export const LazyBookshelf = Bookshelf;
export const LazyReader = Reader;
export const LazyVocabulary = Vocabulary;
export const LazySettings = SettingsPanel;

// 高阶组件包装器（简化版，不再需要 Suspense）
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return Component; // 直接返回组件，不需要 Suspense 包装
}

// 导出包装后的组件
export const BookshelfWithSuspense = Bookshelf;
export const ReaderWithSuspense = Reader;
export const VocabularyWithSuspense = Vocabulary;
export const SettingsWithSuspense = SettingsPanel;

// 预加载函数（现在是同步的，因为组件已经直接导入）
export const preloadAllComponents = (): Promise<void> => {
  console.log('All components loaded synchronously');
  return Promise.resolve();
};