// System theme detection utilities

export interface SystemThemeInfo {
  prefersDark: boolean;
  prefersLight: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  colorScheme: 'light' | 'dark' | 'no-preference';
}

export class SystemThemeDetector {
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private listeners: Map<string, (info: SystemThemeInfo) => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMediaQueries();
    }
  }

  private initializeMediaQueries(): void {
    const queries = {
      dark: '(prefers-color-scheme: dark)',
      light: '(prefers-color-scheme: light)',
      reducedMotion: '(prefers-reduced-motion: reduce)',
      highContrast: '(prefers-contrast: high)',
    };

    Object.entries(queries).forEach(([key, query]) => {
      const mediaQuery = window.matchMedia(query);
      this.mediaQueries.set(key, mediaQuery);
    });
  }

  public getCurrentThemeInfo(): SystemThemeInfo {
    if (typeof window === 'undefined') {
      return {
        prefersDark: false,
        prefersLight: true,
        prefersReducedMotion: false,
        prefersHighContrast: false,
        colorScheme: 'light',
      };
    }

    const darkQuery = this.mediaQueries.get('dark');
    const lightQuery = this.mediaQueries.get('light');
    const reducedMotionQuery = this.mediaQueries.get('reducedMotion');
    const highContrastQuery = this.mediaQueries.get('highContrast');

    const prefersDark = darkQuery?.matches ?? false;
    const prefersLight = lightQuery?.matches ?? true;
    const prefersReducedMotion = reducedMotionQuery?.matches ?? false;
    const prefersHighContrast = highContrastQuery?.matches ?? false;

    let colorScheme: 'light' | 'dark' | 'no-preference' = 'no-preference';
    if (prefersDark) colorScheme = 'dark';
    else if (prefersLight) colorScheme = 'light';

    return {
      prefersDark,
      prefersLight,
      prefersReducedMotion,
      prefersHighContrast,
      colorScheme,
    };
  }

  public addListener(id: string, callback: (info: SystemThemeInfo) => void): void {
    this.listeners.set(id, callback);

    // Add listeners to all media queries
    this.mediaQueries.forEach((mediaQuery) => {
      const handler = () => {
        callback(this.getCurrentThemeInfo());
      };
      mediaQuery.addEventListener('change', handler);
      
      // Store handler for cleanup
      (mediaQuery as any)[`handler_${id}`] = handler;
    });
  }

  public removeListener(id: string): void {
    this.listeners.delete(id);

    // Remove listeners from all media queries
    this.mediaQueries.forEach((mediaQuery) => {
      const handler = (mediaQuery as any)[`handler_${id}`];
      if (handler) {
        mediaQuery.removeEventListener('change', handler);
        delete (mediaQuery as any)[`handler_${id}`];
      }
    });
  }

  public destroy(): void {
    // Remove all listeners
    Array.from(this.listeners.keys()).forEach(id => {
      this.removeListener(id);
    });
    
    this.listeners.clear();
    this.mediaQueries.clear();
  }
}

// Singleton instance
let systemThemeDetector: SystemThemeDetector | null = null;

export const getSystemThemeDetector = (): SystemThemeDetector => {
  if (!systemThemeDetector) {
    systemThemeDetector = new SystemThemeDetector();
  }
  return systemThemeDetector;
};

// Hook for using system theme detection
import React from 'react';

export const useSystemThemeDetection = (
  callback: (info: SystemThemeInfo) => void,
  deps: React.DependencyList = []
): SystemThemeInfo => {
  const [themeInfo, setThemeInfo] = React.useState<SystemThemeInfo>(() => {
    return getSystemThemeDetector().getCurrentThemeInfo();
  });

  React.useEffect(() => {
    const detector = getSystemThemeDetector();
    const id = `hook_${Date.now()}_${Math.random()}`;

    const handleChange = (info: SystemThemeInfo) => {
      setThemeInfo(info);
      callback(info);
    };

    detector.addListener(id, handleChange);

    return () => {
      detector.removeListener(id);
    };
  }, deps);

  return themeInfo;
};