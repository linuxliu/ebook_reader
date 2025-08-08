// Theme configuration and management

export interface ThemeColors {
  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };
  
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  
  // Border colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };
  
  // Interactive colors
  interactive: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    danger: string;
    dangerHover: string;
    success: string;
    successHover: string;
  };
  
  // Reader specific colors
  reader: {
    background: string;
    text: string;
    selection: string;
    selectionText: string;
    highlight: string;
  };
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  cssVariables: Record<string, string>;
}

// Light theme configuration
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
    },
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      focus: '#0ea5e9',
    },
    interactive: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      secondary: '#e2e8f0',
      secondaryHover: '#cbd5e1',
      danger: '#ef4444',
      dangerHover: '#dc2626',
      success: '#10b981',
      successHover: '#059669',
    },
    reader: {
      background: '#ffffff',
      text: '#1e293b',
      selection: '#bae6fd',
      selectionText: '#0c4a6e',
      highlight: '#fef3c7',
    },
  },
  cssVariables: {
    '--color-bg-primary': '#ffffff',
    '--color-bg-secondary': '#f8fafc',
    '--color-bg-tertiary': '#f1f5f9',
    '--color-bg-elevated': '#ffffff',
    '--color-text-primary': '#1e293b',
    '--color-text-secondary': '#475569',
    '--color-text-tertiary': '#64748b',
    '--color-text-inverse': '#ffffff',
    '--color-border-primary': '#e2e8f0',
    '--color-border-secondary': '#cbd5e1',
    '--color-border-focus': '#0ea5e9',
    '--color-interactive-primary': '#0ea5e9',
    '--color-interactive-primary-hover': '#0284c7',
    '--color-interactive-secondary': '#e2e8f0',
    '--color-interactive-secondary-hover': '#cbd5e1',
    '--color-interactive-danger': '#ef4444',
    '--color-interactive-danger-hover': '#dc2626',
    '--color-interactive-success': '#10b981',
    '--color-interactive-success-hover': '#059669',
    '--color-reader-bg': '#ffffff',
    '--color-reader-text': '#1e293b',
    '--color-reader-selection': '#bae6fd',
    '--color-reader-selection-text': '#0c4a6e',
    '--color-reader-highlight': '#fef3c7',
  },
};

// Dark theme configuration
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      elevated: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#1e293b',
    },
    border: {
      primary: '#334155',
      secondary: '#475569',
      focus: '#38bdf8',
    },
    interactive: {
      primary: '#38bdf8',
      primaryHover: '#0ea5e9',
      secondary: '#334155',
      secondaryHover: '#475569',
      danger: '#f87171',
      dangerHover: '#ef4444',
      success: '#34d399',
      successHover: '#10b981',
    },
    reader: {
      background: '#0f172a',
      text: '#e2e8f0',
      selection: '#075985',
      selectionText: '#bae6fd',
      highlight: '#92400e',
    },
  },
  cssVariables: {
    '--color-bg-primary': '#0f172a',
    '--color-bg-secondary': '#1e293b',
    '--color-bg-tertiary': '#334155',
    '--color-bg-elevated': '#1e293b',
    '--color-text-primary': '#f1f5f9',
    '--color-text-secondary': '#cbd5e1',
    '--color-text-tertiary': '#94a3b8',
    '--color-text-inverse': '#1e293b',
    '--color-border-primary': '#334155',
    '--color-border-secondary': '#475569',
    '--color-border-focus': '#38bdf8',
    '--color-interactive-primary': '#38bdf8',
    '--color-interactive-primary-hover': '#0ea5e9',
    '--color-interactive-secondary': '#334155',
    '--color-interactive-secondary-hover': '#475569',
    '--color-interactive-danger': '#f87171',
    '--color-interactive-danger-hover': '#ef4444',
    '--color-interactive-success': '#34d399',
    '--color-interactive-success-hover': '#10b981',
    '--color-reader-bg': '#0f172a',
    '--color-reader-text': '#e2e8f0',
    '--color-reader-selection': '#075985',
    '--color-reader-selection-text': '#bae6fd',
    '--color-reader-highlight': '#92400e',
  },
};

// Theme registry
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Helper functions
export const getTheme = (themeName: ThemeName): Theme => {
  return themes[themeName];
};

export const getThemeNames = (): ThemeName[] => {
  return Object.keys(themes) as ThemeName[];
};

export const isValidThemeName = (name: string): name is ThemeName => {
  return name in themes;
};