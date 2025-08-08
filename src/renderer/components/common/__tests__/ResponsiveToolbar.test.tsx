// Tests for ResponsiveToolbar component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveToolbar } from '../ResponsiveToolbar';

// Mock useResponsiveLayout hook
const mockUseResponsiveLayout = {
  breakpoint: 'lg' as const,
  isMobile: false,
  isTablet: false,
  isCompactMode: false,
  width: 1024,
  height: 768,
  isDesktop: true,
  isLargeScreen: false,
  isToolbarVisible: true,
  toggleToolbar: jest.fn(),
  showToolbar: jest.fn(),
  hideToolbar: jest.fn(),
  orientation: 'landscape' as const,
};

jest.mock('../../hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => mockUseResponsiveLayout,
}));

describe('ResponsiveToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(
      <ResponsiveToolbar>
        <div data-testid="toolbar-content">Toolbar Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.getByTestId('toolbar-content')).toHaveTextContent('Toolbar Content');
  });

  it('should be visible by default', () => {
    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass('opacity-100', 'translate-y-0');
  });

  it('should apply top position by default', () => {
    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass('border-b');
  });

  it('should apply bottom position when specified', () => {
    render(
      <ResponsiveToolbar position="bottom">
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass('border-t');
  });

  it('should apply custom className', () => {
    const customClass = 'custom-toolbar';
    render(
      <ResponsiveToolbar className={customClass}>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass(customClass);
  });

  it('should not show toggle button on desktop', () => {
    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.queryByTitle('隐藏工具栏')).not.toBeInTheDocument();
    expect(screen.queryByTitle('显示工具栏')).not.toBeInTheDocument();
  });

  it('should show toggle button on mobile when autoHide is enabled', () => {
    // Mock mobile layout
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.getByTitle('隐藏工具栏')).toBeInTheDocument();
  });

  it('should show toggle button on tablet when autoHide is enabled', () => {
    // Mock tablet layout
    const tabletLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'md' as const,
      isTablet: true,
      isMobile: false,
      isCompactMode: false,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => tabletLayout,
    }));

    render(
      <ResponsiveToolbar autoHide>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.getByTitle('隐藏工具栏')).toBeInTheDocument();
  });

  it('should not show toggle button when showToggleButton is false', () => {
    // Mock mobile layout
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide showToggleButton={false}>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.queryByTitle('隐藏工具栏')).not.toBeInTheDocument();
  });

  it('should call toggleToolbar when toggle button is clicked', () => {
    const mockToggleToolbar = jest.fn();
    
    // Mock mobile layout with toggle function
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
      toggleToolbar: mockToggleToolbar,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toggleButton = screen.getByTitle('隐藏工具栏');
    fireEvent.click(toggleButton);

    expect(mockToggleToolbar).toHaveBeenCalledTimes(1);
  });

  it('should call onToggle callback when toggle button is clicked', () => {
    const mockOnToggle = jest.fn();
    const mockToggleToolbar = jest.fn();
    
    // Mock mobile layout
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
      toggleToolbar: mockToggleToolbar,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide onToggle={mockOnToggle}>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toggleButton = screen.getByTitle('隐藏工具栏');
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledWith(true); // Current visibility state
  });

  it('should show correct icon when toolbar is hidden', () => {
    // Mock mobile layout with hidden toolbar
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
      isToolbarVisible: false,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    expect(screen.getByTitle('显示工具栏')).toBeInTheDocument();
  });

  it('should apply hidden styles when toolbar is not visible', () => {
    // Mock layout with hidden toolbar
    const hiddenLayout = {
      ...mockUseResponsiveLayout,
      isToolbarVisible: false,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => hiddenLayout,
    }));

    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass('opacity-0', '-translate-y-full');
  });

  it('should apply bottom position hidden styles correctly', () => {
    // Mock layout with hidden toolbar
    const hiddenLayout = {
      ...mockUseResponsiveLayout,
      isToolbarVisible: false,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => hiddenLayout,
    }));

    render(
      <ResponsiveToolbar position="bottom">
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toolbar = screen.getByText('Content').parentElement?.parentElement;
    expect(toolbar).toHaveClass('opacity-0', 'translate-y-full');
  });

  it('should apply compact layout styles on mobile', () => {
    // Mock mobile layout
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const contentContainer = screen.getByText('Content').parentElement;
    expect(contentContainer).toHaveClass('justify-between'); // Compact mode uses justify-between
  });

  it('should apply standard layout styles on desktop', () => {
    render(
      <ResponsiveToolbar>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const contentContainer = screen.getByText('Content').parentElement;
    expect(contentContainer).toHaveClass('justify-center'); // Standard mode uses justify-center
  });

  it('should have proper accessibility attributes on toggle button', () => {
    // Mock mobile layout
    const mobileLayout = {
      ...mockUseResponsiveLayout,
      breakpoint: 'sm' as const,
      isMobile: true,
      isCompactMode: true,
    };

    jest.doMock('../../hooks/useResponsiveLayout', () => ({
      useResponsiveLayout: () => mobileLayout,
    }));

    render(
      <ResponsiveToolbar autoHide>
        <div>Content</div>
      </ResponsiveToolbar>
    );

    const toggleButton = screen.getByTitle('隐藏工具栏');
    expect(toggleButton).toHaveAttribute('aria-label', '隐藏工具栏');
  });
});