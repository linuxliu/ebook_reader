import { useState, useEffect, useCallback } from 'react';

export interface ThemeConfig {
  light: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
  dark: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
}

const defaultThemeConfig: ThemeConfig = {
  light: {
    background: '#ffffff',
    text: '#000000',
    primary: '#3b82f6',
    secondary: '#6b7280'
  },
  dark: {
    background: '#1f2937',
    text: '#ffffff',
    primary: '#60a5fa',
    secondary: '#9ca3af'
  }
};

export type Theme = 'light' | 'dark' | 'system';

export function useThemeManager() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultThemeConfig);

  const applyTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    
    const actualTheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    document.documentElement.setAttribute('data-theme', actualTheme);
  }, []);

  const applySystemTheme = useCallback(() => {
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  }, [currentTheme, applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }, [currentTheme, applyTheme]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [applyTheme, currentTheme]);

  return {
    currentTheme,
    themeConfig,
    applyTheme,
    applySystemTheme,
    toggleTheme,
    setThemeConfig
  };
}