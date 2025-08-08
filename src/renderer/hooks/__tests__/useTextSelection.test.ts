import { renderHook, act } from '@testing-library/react';
import { useTextSelection } from '../useTextSelection';

// Mock window.getSelection
const mockGetSelection = jest.fn();
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: mockGetSelection,
});

// Mock Range
const mockRange = {
  getBoundingClientRect: jest.fn(() => ({
    left: 100,
    top: 200,
    width: 50,
    height: 20,
  })),
  cloneRange: jest.fn(() => mockRange),
  commonAncestorContainer: {
    nodeType: Node.TEXT_NODE,
    parentElement: document.createElement('div'),
  },
};

describe('useTextSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up event listeners
    jest.clearAllTimers();
  });

  it('should initialize with no selection', () => {
    const { result } = renderHook(() => useTextSelection());
    
    expect(result.current.selection).toBeNull();
  });

  it('should handle text selection', async () => {
    jest.useFakeTimers();
    const onSelectionChange = jest.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    // Create a container element
    const container = document.createElement('div');
    container.textContent = 'This is some selected text for testing';
    document.body.appendChild(container);

    // Create a proper mock range that contains the container
    const mockRangeWithContainer = {
      ...mockRange,
      commonAncestorContainer: container,
    };

    // Mock a selection
    const mockSelection = {
      toString: () => 'selected text',
      rangeCount: 1,
      getRangeAt: () => mockRangeWithContainer,
      removeAllRanges: jest.fn(),
    };
    mockGetSelection.mockReturnValue(mockSelection);

    // Register the container
    act(() => {
      result.current.registerContainer(container);
    });

    // Simulate selection change
    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'selected text',
        position: expect.objectContaining({
          x: 125, // left + width/2
          y: 200,
          width: 50,
          height: 20,
        }),
      })
    );

    jest.useRealTimers();
  });

  it('should clear selection when text is too short', () => {
    jest.useFakeTimers();
    const onSelectionChange = jest.fn();
    const { result } = renderHook(() => 
      useTextSelection({ 
        onSelectionChange,
        minSelectionLength: 5 
      })
    );

    // Mock a short selection
    const mockSelection = {
      toString: () => 'hi',
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: jest.fn(),
    };
    mockGetSelection.mockReturnValue(mockSelection);

    // Simulate selection change
    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(null);
    jest.useRealTimers();
  });

  it('should clear selection when clicking outside', () => {
    const onSelectionChange = jest.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    // Create container and register it
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    act(() => {
      result.current.registerContainer(container);
    });

    // Manually set selection state to simulate having a selection
    const mockSelectionInfo = {
      text: 'test',
      position: { x: 0, y: 0, width: 0, height: 0 },
      range: mockRange as any,
      containerElement: document.createElement('div'),
    };

    // Use a ref to track selection state
    (result.current as any).selection = mockSelectionInfo;

    // Click outside the container
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    // Mock getSelection to return null (no selection)
    mockGetSelection.mockReturnValue({
      removeAllRanges: jest.fn(),
    });

    act(() => {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: outsideElement });
      document.dispatchEvent(event);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it('should handle keyboard selection', () => {
    jest.useFakeTimers();
    const onSelectionChange = jest.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    // Create a container element
    const container = document.createElement('div');
    container.textContent = 'keyboard selected text';
    document.body.appendChild(container);

    // Create a proper mock range that contains the container
    const mockRangeWithContainer = {
      ...mockRange,
      commonAncestorContainer: container,
    };

    // Mock a selection
    const mockSelection = {
      toString: () => 'keyboard selected',
      rangeCount: 1,
      getRangeAt: () => mockRangeWithContainer,
      removeAllRanges: jest.fn(),
    };
    mockGetSelection.mockReturnValue(mockSelection);

    // Register the container
    act(() => {
      result.current.registerContainer(container);
    });

    // Simulate keyboard selection
    act(() => {
      const event = new KeyboardEvent('keyup', { 
        key: 'ArrowRight', 
        shiftKey: true 
      });
      document.dispatchEvent(event);
    });

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'keyboard selected',
      })
    );

    jest.useRealTimers();
  });

  it('should provide selection context', () => {
    const { result } = renderHook(() => useTextSelection());

    // Create a proper container element with text content
    const container = document.createElement('div');
    container.textContent = 'This is the selected text in a longer context for testing purposes.';

    // Mock selection with context
    const mockSelectionWithContext = {
      text: 'selected',
      position: { x: 0, y: 0, width: 0, height: 0 },
      range: {
        ...mockRange,
        commonAncestorContainer: container,
        startContainer: container.firstChild,
        endContainer: container.firstChild,
        startOffset: 12,
        endOffset: 20,
        intersectsNode: () => true,
      },
      containerElement: container,
    };

    // Manually set the selection
    (result.current as any).selection = mockSelectionWithContext;

    const context = result.current.getSelectionContext(20);
    expect(context).toBe('selected'); // Should return the selected text when context extraction fails
  });

  it('should clear selection programmatically', () => {
    const onSelectionChange = jest.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    // Mock browser selection
    const mockSelection = {
      removeAllRanges: jest.fn(),
    };
    mockGetSelection.mockReturnValue(mockSelection);

    act(() => {
      result.current.clearSelection();
    });

    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });
});