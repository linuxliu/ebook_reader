import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useComponentSize } from '../../utils/performanceOptimization';

export interface VirtualListItem {
  id: string;
  height?: number;
}

export interface VirtualListProps<T extends VirtualListItem> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

interface VisibleRange {
  start: number;
  end: number;
}

// Memoized virtual list item component
const VirtualListItem = memo<{
  item: any;
  index: number;
  style: React.CSSProperties;
  renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
}>(({ item, index, style, renderItem }) => {
  return (
    <div style={style}>
      {renderItem(item, index, style)}
    </div>
  );
});

export const VirtualList = memo(function VirtualList<T extends VirtualListItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const { elementRef: sizeRef, size } = useComponentSize();
  
  // Use actual container size if available
  const actualContainerHeight = size.height || containerHeight;

  const getItemHeight = useCallback((item: T, index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(item, index);
    }
    return itemHeight;
  }, [itemHeight]);

  // Calculate item positions and total height
  const { itemPositions, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(currentPosition);
      currentPosition += getItemHeight(items[i], i);
    }

    return {
      itemPositions: positions,
      totalHeight: currentPosition
    };
  }, [items, getItemHeight]);

  // Calculate visible range with optimized algorithm
  const visibleRange = useMemo((): VisibleRange => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    start = Math.max(0, start - overscan);

    // Find end index
    let visibleEnd = start;
    const viewportBottom = scrollTop + actualContainerHeight;
    
    for (let i = start; i < items.length; i++) {
      if (itemPositions[i] > viewportBottom + overscan * 50) { // Approximate overscan
        break;
      }
      visibleEnd = i;
    }

    return {
      start,
      end: Math.min(items.length - 1, visibleEnd + overscan)
    };
  }, [items.length, itemPositions, scrollTop, actualContainerHeight, overscan]);

  // Throttled scroll handler for better performance
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    
    // Use requestAnimationFrame to throttle scroll updates
    requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    });
  }, [onScroll]);

  // Render visible items with memoization
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= items.length) break;
      
      const item = items[i];
      const top = itemPositions[i];
      const height = getItemHeight(item, i);
      
      const style: React.CSSProperties = {
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height,
        zIndex: 1
      };

      items_to_render.push(
        <VirtualListItem
          key={item.id}
          item={item}
          index={i}
          style={style}
          renderItem={renderItem}
        />
      );
    }

    return items_to_render;
  }, [items, visibleRange, itemPositions, getItemHeight, renderItem]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) {
      return;
    }

    const itemTop = itemPositions[index];
    const itemHeight = getItemHeight(items[index], index);
    
    let scrollTo = itemTop;
    
    if (align === 'center') {
      scrollTo = itemTop - (actualContainerHeight - itemHeight) / 2;
    } else if (align === 'end') {
      scrollTo = itemTop - actualContainerHeight + itemHeight;
    }

    scrollElementRef.current.scrollTop = Math.max(0, Math.min(scrollTo, totalHeight - actualContainerHeight));
  }, [items, itemPositions, actualContainerHeight, totalHeight, getItemHeight]);

  // Expose scroll methods via ref
  React.useImperativeHandle(scrollElementRef, () => ({
    scrollToItem,
    scrollTop: scrollTop,
    scrollToTop: (top: number) => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = top;
      }
    }
  }));

  return (
    <div
      ref={(el) => {
        if (scrollElementRef.current !== el) {
          scrollElementRef.current = el;
        }
        if (sizeRef.current !== el) {
          sizeRef.current = el;
        }
      }}
      className={`virtual-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        willChange: 'scroll-position' // Optimize for scrolling
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          contain: 'layout style paint' // CSS containment for performance
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}) as <T extends VirtualListItem>(props: VirtualListProps<T>) => JSX.Element;

// Hook for easier usage with dynamic heights
export function useVirtualList<T extends VirtualListItem>(
  items: T[],
  estimatedItemHeight: number,
  containerHeight: number
) {
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());

  const getItemHeight = useCallback((item: T, index: number): number => {
    return itemHeights.get(item.id) || estimatedItemHeight;
  }, [itemHeights, estimatedItemHeight]);

  const setItemHeight = useCallback((itemId: string, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, height);
      return newMap;
    });
  }, []);

  return {
    getItemHeight,
    setItemHeight,
    totalEstimatedHeight: items.length * estimatedItemHeight
  };
}