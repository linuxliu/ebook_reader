// Tests for useResponsiveLayout hook

import { renderHook, act } from '@testing-library/react';
import { useResponsiveLayout } from '../useResponsiveLayout';

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Mock resize event
const mockResizeEvent = (width: number, height: number) => {
  mockWindowDimensions(width, height);
  window.dispatchEvent(new Event('resize'));
};

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    // Set default window dimensions
    mockWindowDimensions(1024, 768);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct desktop breakpoint', () => {
    mockWindowDimensions(1024, 768);
    
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.breakpoint).toBe('lg');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('should detect mobile breakpoint correctly', () => {
    mockWindowDimensions(640, 480);
    
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.breakpoint).toBe('sm');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isCompactMode).toBe(true);
  });

  it('should detect tablet breakpoint correctly', () => {
    mockWindowDimensions(800, 600);
    
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.breakpoint).toBe('md');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect large screen breakpoint correctly', () => {
    mockWindowDimensions(1400, 900);
    
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.breakpoint).toBe('xl');
    expect(result.current.isLargeScreen).toBe(true);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should update on window resize', () => {
    const { result } = renderHook(() => useResponsiveLayout());

    // Initial desktop size
    expect(result.current.isDesktop).toBe(true);

    // Resize to mobile
    act(() => {
      mockResizeEvent(640, 480);
    });

    expect(result.current.width).toBe(640);
    expect(result.current.height).toBe(480);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should handle toolbar visibility correctly', () => {
    const { result } = renderHook(() => useResponsiveLayout());

    // Initially visible
    expect(result.current.isToolbarVisible).toBe(true);

    // Toggle toolbar
    act(() => {
      result.current.toggleToolbar();
    });

    expect(result.current.isToolbarVisible).toBe(false);

    // Show toolbar
    act(() => {
      result.current.showToolbar();
    });

    expect(result.current.isToolbarVisible).toBe(true);

    // Hide toolbar
    act(() => {
      result.current.hideToolbar();
    });

    expect(result.current.isToolbarVisible).toBe(false);
  });

  it('should auto-hide toolbar on mobile landscape', () => {
    // Start with mobile portrait
    mockWindowDimensions(480, 640);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.isToolbarVisible).toBe(true);

    // Switch to mobile landscape
    act(() => {
      mockResizeEvent(640, 480);
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isToolbarVisible).toBe(false);
  });

  it('should always show toolbar on desktop', () => {
    mockWindowDimensions(1024, 768);
    const { result } = renderHook(() => useResponsiveLayout());

    // Hide toolbar manually
    act(() => {
      result.current.hideToolbar();
    });

    // Resize to larger desktop size
    act(() => {
      mockResizeEvent(1400, 900);
    });

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isToolbarVisible).toBe(true);
  });

  it('should detect orientation correctly', () => {
    // Portrait
    mockWindowDimensions(480, 640);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.orientation).toBe('portrait');

    // Landscape
    act(() => {
      mockResizeEvent(640, 480);
    });

    expect(result.current.orientation).toBe('landscape');
  });

  it('should use custom breakpoints', () => {
    const customBreakpoints = {
      sm: 500,
      md: 700,
      lg: 900,
      xl: 1200,
      '2xl': 1500,
    };

    mockWindowDimensions(800, 600);
    const { result } = renderHook(() => useResponsiveLayout(customBreakpoints));

    expect(result.current.breakpoint).toBe('md');
    expect(result.current.isTablet).toBe(true);
  });

  it('should handle compact mode correctly', () => {
    // Mobile portrait - should be compact
    mockWindowDimensions(480, 640);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.isCompactMode).toBe(true);

    // Tablet landscape - should not be compact
    act(() => {
      mockResizeEvent(900, 600);
    });

    expect(result.current.isCompactMode).toBe(false);

    // Tablet portrait - should be compact
    act(() => {
      mockResizeEvent(600, 900);
    });

    expect(result.current.isCompactMode).toBe(true);
  });

  it('should cleanup resize listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useResponsiveLayout());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});