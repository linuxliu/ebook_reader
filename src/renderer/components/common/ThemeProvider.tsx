// Theme provider component for managing theme state and CSS variables

import React, { createContext, useContext, useEffect } from 'react';
import { useThemeManager, UseThemeManagerReturn } from '../../hooks/useThemeManager';

interface ThemeContextValue extends UseThemeManagerReturn {}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeManager = useThemeManager();

  // Apply initial theme class to prevent flash of unstyled content
  useEffect(() => {
    const { effectiveTheme } = themeManager;
    
    // Ensure theme class is applied immediately
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(effectiveTheme);
  }, [themeManager.effectiveTheme]);

  return (
    <ThemeContext.Provider value={themeManager}>
      {children}
    </ThemeContext.Provider>
  );
};