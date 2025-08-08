// Tests for ThemeToggle component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';
import { AppStateProvider } from '../../../store/context';
import { initialState } from '../../../store/reducer';

// Mock useThemeManager
const mockToggleTheme = jest.fn();
const mockApplySystemTheme = jest.fn();

jest.mock('../../hooks/useThemeManager', () => ({
  useThemeManager: () => ({
    currentTheme: 'light',
    themeConfig: {
      name: 'light',
      colors: {},
      cssVariables: {},
    },
    systemTheme: 'light',
    effectiveTheme: 'light',
    setTheme: jest.fn(),
    toggleTheme: mockToggleTheme,
    applySystemTheme: mockApplySystemTheme,
    isSystemTheme: false,
  }),
}));

const renderWithProviders = (props = {}) => {
  return render(
    <AppStateProvider initialState={initialState}>
      <ThemeProvider>
        <ThemeToggle {...props} />
      </ThemeProvider>
    </AppStateProvider>
  );
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render theme toggle buttons', () => {
    renderWithProviders();

    // Should have two buttons: theme toggle and system theme
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('should show moon icon for light theme', () => {
    renderWithProviders();

    const toggleButton = screen.getByTitle('切换到深色主题');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should call toggleTheme when theme toggle button is clicked', () => {
    renderWithProviders();

    const toggleButton = screen.getByTitle('切换到深色主题');
    fireEvent.click(toggleButton);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should call applySystemTheme when system theme button is clicked', () => {
    renderWithProviders();

    const systemButton = screen.getByTitle('跟随系统主题');
    fireEvent.click(systemButton);

    expect(mockApplySystemTheme).toHaveBeenCalledTimes(1);
  });

  it('should apply correct size classes', () => {
    renderWithProviders({ size: 'lg' });

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('w-12', 'h-12');
    });
  });

  it('should show label when showLabel is true', () => {
    renderWithProviders({ showLabel: true });

    expect(screen.getByText('浅色')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const customClass = 'custom-theme-toggle';
    renderWithProviders({ className: customClass });

    const container = screen.getByRole('button').parentElement;
    expect(container).toHaveClass(customClass);
  });

  it('should show system theme as active when isSystemTheme is true', () => {
    // Mock system theme active state
    jest.doMock('../../hooks/useThemeManager', () => ({
      useThemeManager: () => ({
        currentTheme: 'light',
        themeConfig: { name: 'light', colors: {}, cssVariables: {} },
        systemTheme: 'light',
        effectiveTheme: 'light',
        setTheme: jest.fn(),
        toggleTheme: mockToggleTheme,
        applySystemTheme: mockApplySystemTheme,
        isSystemTheme: true,
      }),
    }));

    renderWithProviders({ showLabel: true });

    expect(screen.getByText('系统')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderWithProviders();

    const toggleButton = screen.getByTitle('切换到深色主题');
    const systemButton = screen.getByTitle('跟随系统主题');

    expect(toggleButton).toHaveAttribute('aria-label', '切换到深色主题');
    expect(systemButton).toHaveAttribute('aria-label', '跟随系统主题');
  });

  it('should handle different theme states correctly', () => {
    // Test with dark theme
    jest.doMock('../../hooks/useThemeManager', () => ({
      useThemeManager: () => ({
        currentTheme: 'dark',
        themeConfig: { name: 'dark', colors: {}, cssVariables: {} },
        systemTheme: 'dark',
        effectiveTheme: 'dark',
        setTheme: jest.fn(),
        toggleTheme: mockToggleTheme,
        applySystemTheme: mockApplySystemTheme,
        isSystemTheme: false,
      }),
    }));

    const { rerender } = render(
      <AppStateProvider initialState={initialState}>
        <ThemeProvider>
          <ThemeToggle showLabel />
        </ThemeProvider>
      </AppStateProvider>
    );

    // In a real implementation, this would show sun icon and "深色" label
    // The test structure shows how it would work
    expect(screen.getByTitle('切换到浅色主题')).toBeInTheDocument();
  });
});