// Responsive toolbar component with show/hide functionality

import React from 'react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ResponsiveToolbarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  showToggleButton?: boolean;
  onToggle?: (visible: boolean) => void;
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  children,
  className = '',
  position = 'top',
  autoHide = true,
  showToggleButton = true,
  onToggle,
}) => {
  const { 
    isToolbarVisible, 
    toggleToolbar, 
    isMobile, 
    isTablet, 
    isCompactMode,
    orientation 
  } = useResponsiveLayout();

  const handleToggle = () => {
    toggleToolbar();
    onToggle?.(isToolbarVisible);
  };

  // Position classes
  const positionClasses = {
    top: 'top-0',
    bottom: 'bottom-0',
  };

  // Responsive classes
  const getResponsiveClasses = () => {
    const baseClasses = [
      'w-full',
      'bg-white dark:bg-gray-800',
      'border-gray-200 dark:border-gray-700',
      'transition-all duration-300 ease-in-out',
      'z-40',
    ];

    if (position === 'top') {
      baseClasses.push('border-b');
    } else {
      baseClasses.push('border-t');
    }

    // Mobile specific classes
    if (isMobile) {
      baseClasses.push('px-2 py-1');
      
      if (orientation === 'landscape' && autoHide) {
        baseClasses.push('fixed', positionClasses[position]);
      }
    } else if (isTablet) {
      baseClasses.push('px-4 py-2');
    } else {
      baseClasses.push('px-6 py-3');
    }

    return baseClasses;
  };

  // Visibility classes
  const visibilityClasses = isToolbarVisible 
    ? 'opacity-100 translate-y-0' 
    : `opacity-0 ${position === 'top' ? '-translate-y-full' : 'translate-y-full'}`;

  // Toggle button classes
  const toggleButtonClasses = [
    'fixed',
    position === 'top' ? 'top-2' : 'bottom-2',
    'right-2',
    'z-50',
    'bg-gray-800 dark:bg-gray-200',
    'text-white dark:text-gray-800',
    'rounded-full',
    'w-10 h-10',
    'flex items-center justify-center',
    'shadow-lg',
    'transition-all duration-200',
    'hover:scale-110',
    'focus:outline-none focus:ring-2 focus:ring-blue-500',
  ].join(' ');

  const toolbarClasses = [
    ...getResponsiveClasses(),
    visibilityClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Toolbar */}
      <div className={toolbarClasses}>
        <div className={`flex items-center ${isCompactMode ? 'justify-between' : 'justify-center'}`}>
          {children}
        </div>
      </div>

      {/* Toggle button - only show on mobile/tablet when auto-hide is enabled */}
      {showToggleButton && (isMobile || isTablet) && autoHide && (
        <button
          onClick={handleToggle}
          className={toggleButtonClasses}
          title={isToolbarVisible ? '隐藏工具栏' : '显示工具栏'}
          aria-label={isToolbarVisible ? '隐藏工具栏' : '显示工具栏'}
        >
          {isToolbarVisible ? (
            // Hide icon
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Show icon
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      )}
    </>
  );
};