// Theme toggle component for switching between light and dark themes

import React from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false,
  size = 'md'
}) => {
  const { effectiveTheme, toggleTheme, isSystemTheme, applySystemTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggle = () => {
    if (isSystemTheme) {
      // If currently using system theme, switch to opposite of current system theme
      toggleTheme();
    } else {
      // If using manual theme, toggle it
      toggleTheme();
    }
  };

  const handleSystemTheme = () => {
    applySystemTheme();
  };

  const SunIcon = () => (
    <svg 
      className={iconClasses[size]} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
      />
    </svg>
  );

  const MoonIcon = () => (
    <svg 
      className={iconClasses[size]} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
      />
    </svg>
  );

  const SystemIcon = () => (
    <svg 
      className={iconClasses[size]} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
      />
    </svg>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Theme toggle button */}
      <button
        onClick={handleToggle}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-lg
          bg-gray-100 hover:bg-gray-200 
          dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
        `}
        title={`切换到${effectiveTheme === 'light' ? '深色' : '浅色'}主题`}
        aria-label={`切换到${effectiveTheme === 'light' ? '深色' : '浅色'}主题`}
      >
        {effectiveTheme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>

      {/* System theme button */}
      <button
        onClick={handleSystemTheme}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
          ${isSystemTheme 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }
        `}
        title="跟随系统主题"
        aria-label="跟随系统主题"
      >
        <SystemIcon />
      </button>

      {/* Label */}
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isSystemTheme ? '系统' : effectiveTheme === 'light' ? '浅色' : '深色'}
        </span>
      )}
    </div>
  );
};