// Responsive container component for adaptive layouts

import React from 'react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  centerContent?: boolean;
  adaptiveLayout?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'full',
  padding = 'md',
  centerContent = false,
  adaptiveLayout = true,
}) => {
  const { breakpoint, isMobile, isTablet, isCompactMode } = useResponsiveLayout();

  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  // Padding classes based on screen size
  const getPaddingClasses = () => {
    if (padding === 'none') return '';
    
    const basePadding = {
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    };

    if (!adaptiveLayout) return basePadding[padding];

    // Adaptive padding based on screen size
    if (isMobile) {
      return {
        sm: 'p-1',
        md: 'p-2',
        lg: 'p-3',
      }[padding];
    }

    if (isTablet) {
      return {
        sm: 'p-2',
        md: 'p-3',
        lg: 'p-4',
      }[padding];
    }

    return basePadding[padding];
  };

  // Container classes
  const containerClasses = [
    'w-full',
    maxWidthClasses[maxWidth],
    getPaddingClasses(),
    centerContent ? 'mx-auto' : '',
    isCompactMode ? 'compact-layout' : 'standard-layout',
    `breakpoint-${breakpoint}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} data-breakpoint={breakpoint}>
      {children}
    </div>
  );
};