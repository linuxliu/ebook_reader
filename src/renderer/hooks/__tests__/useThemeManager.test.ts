// Tests for useThemeManager hook

import { renderHook, act } from '@testing-library/react';
import { useThemeManager } from '../useThemeManager';
import React from 'react';

// Mock the store hooks
const mockDispatch = jest.fn();
jest.mock('../../store/hooks', () => ({
  useAppState: () => ({
    theme: 'light',
    settings: { theme: 'system' },
  }),
  useAppDispatch: () => mockDispatch,
}));

// Mock system theme detector
jest.mock('../../utils/systemThemeDetector', () => ({
  useSystemThemeDetection: (callback: any) => ({
    prefersDark: false,
    prefersLight: true,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    colorScheme: 'light' as const,
  }),
}));

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('useThemeManager', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.className = '';
    document.body.className = '';
    document.documentElement.style.cssText = '';
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => mockMatchMedia(false)),
    });
    
    jest.clearAllMocks();
  });

  it('should initialize with light theme when system preference is light', () => {
    const { result } = renderHook(() => useThemeManager());

    expect(result.current.systemTheme).toBe('light');
    expect(result.current.effectiveTheme).toBe('light');
    expect(result.current.isSystemTheme).toBe(true);
  });

  it('should return correct theme configuration', () => {
    const { result } = renderHook(() => useThemeManager());

    expect(result.current.themeConfig).toHaveProperty('name');
    expect(result.current.themeConfig).toHaveProperty('colors');
    expect(result.current.themeConfig).toHaveProperty('cssVariables');
    expect(result.current.themeConfig.colors).toHaveProperty('background');
    expect(result.current.themeConfig.colors).toHaveProperty('text');
    expect(result.current.themeConfig.colors).toHaveProperty('interactive');
    expect(result.current.themeConfig.colors).toHaveProperty('reader');
  });

  it('should have toggle and apply functions', () => {
    const { result } = renderHook(() => useThemeManager());

    expect(typeof result.current.toggleTheme).toBe('function');
    expect(typeof result.current.applySystemTheme).toBe('function');
    expect(typeof result.current.setTheme).toBe('function');
  });

  it('should call dispatch when toggling theme', () => {
    const { result } = renderHook(() => useThemeManager());

    act(() => {
      result.current.toggleTheme();
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should call dispatch when applying system theme', () => {
    const { result } = renderHook(() => useThemeManager());

    act(() => {
      result.current.applySystemTheme();
    });

    expect(mockDispatch).toHaveBeenCalled();
  });
});