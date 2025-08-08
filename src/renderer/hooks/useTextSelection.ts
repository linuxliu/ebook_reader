import { useState, useCallback, useRef, useEffect } from 'react';

export interface TextSelectionInfo {
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  range: Range;
  containerElement: Element;
}

export interface UseTextSelectionOptions {
  onSelectionChange?: (selection: TextSelectionInfo | null) => void;
  minSelectionLength?: number;
  debounceMs?: number;
}

export const useTextSelection = (options: UseTextSelectionOptions = {}) => {
  const {
    onSelectionChange,
    minSelectionLength = 1,
    debounceMs = 100
  } = options;

  const [selection, setSelection] = useState<TextSelectionInfo | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLElement | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    onSelectionChange?.(null);
    
    // Clear browser selection
    const browserSelection = window.getSelection();
    if (browserSelection) {
      browserSelection.removeAllRanges();
    }
  }, [onSelectionChange]);

  const handleSelectionChange = useCallback(() => {
    // Clear previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const browserSelection = window.getSelection();
      
      if (!browserSelection || browserSelection.rangeCount === 0) {
        clearSelection();
        return;
      }

      const selectedText = browserSelection.toString().trim();
      
      // Check minimum selection length
      if (selectedText.length < minSelectionLength) {
        clearSelection();
        return;
      }

      const range = browserSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Check if selection is within our container
      if (containerRef.current && range.commonAncestorContainer) {
        const ancestorNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
          ? range.commonAncestorContainer.parentNode 
          : range.commonAncestorContainer;
        
        if (ancestorNode && !containerRef.current.contains(ancestorNode as Node)) {
          clearSelection();
          return;
        }
      }

      // Calculate position relative to viewport
      const position = {
        x: rect.left + rect.width / 2, // Center horizontally
        y: rect.top, // Top of selection
        width: rect.width,
        height: rect.height
      };

      const selectionInfo: TextSelectionInfo = {
        text: selectedText,
        position,
        range: range.cloneRange(),
        containerElement: range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
          ? range.commonAncestorContainer.parentElement!
          : range.commonAncestorContainer as Element
      };

      setSelection(selectionInfo);
      onSelectionChange?.(selectionInfo);
    }, debounceMs);
  }, [minSelectionLength, debounceMs, onSelectionChange, clearSelection]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    // Small delay to ensure selection is complete
    setTimeout(handleSelectionChange, 10);
  }, [handleSelectionChange]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Handle keyboard selection (Shift + Arrow keys, Ctrl+A, etc.)
    if (event.shiftKey || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      setTimeout(handleSelectionChange, 10);
    }
  }, [handleSelectionChange]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (selection && containerRef.current && !containerRef.current.contains(event.target as Node)) {
      clearSelection();
    }
  }, [selection, clearSelection]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('selectionchange', handleSelectionChange);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [handleMouseUp, handleKeyUp, handleClickOutside, handleSelectionChange]);

  const registerContainer = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  const getSelectionContext = useCallback((contextLength: number = 50): string => {
    if (!selection) return '';

    const { range } = selection;
    const container = range.commonAncestorContainer;
    const textContent = container.textContent || '';
    
    // Find the start and end positions of the selection within the full text
    const walker = document.createTreeWalker(
      container.nodeType === Node.TEXT_NODE ? container.parentElement! : container as Element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let selectionStart = -1;
    let selectionEnd = -1;
    let node: Text | null;

    while (node = walker.nextNode() as Text) {
      const nodeLength = node.textContent?.length || 0;
      
      if (range.intersectsNode(node)) {
        if (selectionStart === -1) {
          selectionStart = currentPos + (node === range.startContainer ? range.startOffset : 0);
        }
        if (node === range.endContainer) {
          selectionEnd = currentPos + range.endOffset;
          break;
        }
      }
      
      currentPos += nodeLength;
    }

    if (selectionStart === -1 || selectionEnd === -1) {
      return selection.text;
    }

    // Extract context around the selection
    const contextStart = Math.max(0, selectionStart - contextLength);
    const contextEnd = Math.min(textContent.length, selectionEnd + contextLength);
    
    let context = textContent.substring(contextStart, contextEnd);
    
    // Add ellipsis if we truncated
    if (contextStart > 0) context = '...' + context;
    if (contextEnd < textContent.length) context = context + '...';
    
    return context;
  }, [selection]);

  return {
    selection,
    clearSelection,
    registerContainer,
    getSelectionContext
  };
};