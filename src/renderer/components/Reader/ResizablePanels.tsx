import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelVisible: boolean;
  onLeftPanelVisibilityChange: (visible: boolean) => void;
  onPanelSizeChange?: (leftWidth: number, rightWidth: number) => void;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  defaultLeftWidth?: number;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  leftPanelVisible,
  onLeftPanelVisibilityChange,
  onPanelSizeChange,
  minLeftWidth = 200,
  maxLeftWidth = 500,
  defaultLeftWidth = 320
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  // 处理拖拽调整大小
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    
    // 限制最小和最大宽度
    const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
    setLeftWidth(clampedWidth);
    
    // 通知父组件尺寸变化
    if (onPanelSizeChange) {
      const rightWidth = containerRect.width - clampedWidth;
      onPanelSizeChange(clampedWidth, rightWidth);
    }
  }, [isResizing, minLeftWidth, maxLeftWidth, onPanelSizeChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 监听容器大小变化，调整面板宽度
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxAllowedWidth = Math.min(maxLeftWidth, containerWidth * 0.6); // 最多占60%
        if (leftWidth > maxAllowedWidth) {
          setLeftWidth(maxAllowedWidth);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [leftWidth, maxLeftWidth]);

  // 切换左面板显示/隐藏
  const toggleLeftPanel = useCallback(() => {
    onLeftPanelVisibilityChange(!leftPanelVisible);
  }, [leftPanelVisible, onLeftPanelVisibilityChange]);

  return (
    <div ref={containerRef} className="flex h-full relative">
      {/* 左面板 */}
      {leftPanelVisible && (
        <div
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: `${leftWidth}px` }}
        >
          {leftPanel}
        </div>
      )}

      {/* 分割线 */}
      {leftPanelVisible && (
        <div
          ref={resizerRef}
          className={`
            w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-600
            cursor-col-resize transition-colors duration-200 flex-shrink-0
            ${isResizing ? 'bg-blue-500 dark:bg-blue-500' : ''}
          `}
          onMouseDown={handleMouseDown}
          title="拖拽调整面板大小"
        >
          {/* 拖拽指示器 */}
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-0.5 h-8 bg-gray-400 dark:bg-gray-500 rounded-full opacity-50"></div>
          </div>
        </div>
      )}

      {/* 右面板 */}
      <div className="flex-1 min-w-0 relative">
        {/* 切换按钮 - 只在目录隐藏时显示 */}
        {!leftPanelVisible && (
          <button
            onClick={toggleLeftPanel}
            className="absolute top-4 left-0 z-10 p-2 rounded-r-lg transition-all duration-200 bg-white dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
            title="显示目录"
          >
            <svg 
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 右面板内容 */}
        <div className="h-full">
          {rightPanel}
        </div>
      </div>

      {/* 拖拽时的遮罩 */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default ResizablePanels;