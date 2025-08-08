import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6', 'w-6', 'text-blue-600', 'animate-spin');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with custom color', () => {
    render(<LoadingSpinner color="white" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-white');
  });

  it('renders with text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    expect(screen.getByText('Loading data...')).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const container = screen.getByText('', { selector: '.custom-class' });
    expect(container).toBeInTheDocument();
  });

  it('renders all size variants correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('h-6', 'w-6');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="xl" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('h-12', 'w-12');
  });

  it('renders all color variants correctly', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('text-blue-600');

    rerender(<LoadingSpinner color="secondary" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('text-gray-600');

    rerender(<LoadingSpinner color="white" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('text-white');

    rerender(<LoadingSpinner color="gray" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('text-gray-400');
  });
});