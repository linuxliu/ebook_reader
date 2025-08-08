// Tests for ResponsiveContainer component

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveContainer } from '../ResponsiveContainer';

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

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(
      <ResponsiveContainer>
        <div data-testid="child">Test Content</div>
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Test Content');
  });

  it('should apply default classes', () => {
    render(
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('w-full', 'max-w-full', 'p-4', 'standard-layout', 'breakpoint-lg');
  });

  it('should apply custom className', () => {
    const customClass = 'custom-container';
    render(
      <ResponsiveContainer className={customClass}>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass(customClass);
  });

  it('should apply maxWidth classes correctly', () => {
    render(
      <ResponsiveContainer maxWidth="md">
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('max-w-md');
  });

  it('should center content when centerContent is true', () => {
    render(
      <ResponsiveContainer centerContent>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('mx-auto');
  });

  it('should apply no padding when padding is none', () => {
    render(
      <ResponsiveContainer padding="none">
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).not.toHaveClass('p-1', 'p-2', 'p-3', 'p-4', 'p-6');
  });

  it('should apply compact layout for mobile', () => {
    // Mock mobile breakpoint
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
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('compact-layout', 'breakpoint-sm');
  });

  it('should apply adaptive padding for mobile', () => {
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
      <ResponsiveContainer padding="md" adaptiveLayout>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('p-2'); // Reduced padding for mobile
  });

  it('should apply adaptive padding for tablet', () => {
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
      <ResponsiveContainer padding="md" adaptiveLayout>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('p-3'); // Medium padding for tablet
  });

  it('should disable adaptive layout when adaptiveLayout is false', () => {
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
      <ResponsiveContainer padding="md" adaptiveLayout={false}>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('p-4'); // Standard padding even on mobile
  });

  it('should set data-breakpoint attribute', () => {
    render(
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveAttribute('data-breakpoint', 'lg');
  });

  it('should handle all maxWidth options', () => {
    const maxWidthOptions = ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const;
    
    maxWidthOptions.forEach(maxWidth => {
      const { unmount } = render(
        <ResponsiveContainer maxWidth={maxWidth}>
          <div>Content {maxWidth}</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText(`Content ${maxWidth}`).parentElement;
      expect(container).toHaveClass(`max-w-${maxWidth}`);
      
      unmount();
    });
  });

  it('should handle all padding options', () => {
    const paddingOptions = ['none', 'sm', 'md', 'lg'] as const;
    
    paddingOptions.forEach(padding => {
      const { unmount } = render(
        <ResponsiveContainer padding={padding}>
          <div>Content {padding}</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText(`Content ${padding}`).parentElement;
      
      if (padding === 'none') {
        expect(container).not.toHaveClass('p-1', 'p-2', 'p-3', 'p-4', 'p-6');
      } else {
        // Should have some padding class
        const hasAnyPaddingClass = ['p-1', 'p-2', 'p-3', 'p-4', 'p-6'].some(cls => 
          container?.classList.contains(cls)
        );
        expect(hasAnyPaddingClass).toBe(true);
      }
      
      unmount();
    });
  });
});