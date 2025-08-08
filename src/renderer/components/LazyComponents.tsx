import React, { Suspense, lazy } from 'react';

// 懒加载组件
export const LazyBookshelf = lazy(() => import('./Bookshelf/Bookshelf'));
export const LazyReader = lazy(() => import('./Reader/Reader'));
export const LazyVocabulary = lazy(() => import('./Vocabulary/Vocabulary'));
export const LazySettings = lazy(() => import('./Settings/SettingsPanel'));

// 高阶组件包装器
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <div>Loading...</div>
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// 导出包装后的组件
export const BookshelfWithSuspense = withSuspense(LazyBookshelf);
export const ReaderWithSuspense = withSuspense(LazyReader);
export const VocabularyWithSuspense = withSuspense(LazyVocabulary);
export const SettingsWithSuspense = withSuspense(LazySettings);

// 预加载所有组件的函数
export const preloadAllComponents = async (): Promise<void> => {
  try {
    await Promise.all([
      import('./Bookshelf/Bookshelf'),
      import('./Reader/Reader'),
      import('./Vocabulary/Vocabulary'),
      import('./Settings/SettingsPanel')
    ]);
    console.log('All components preloaded successfully');
  } catch (error) {
    console.error('Failed to preload components:', error);
  }
};