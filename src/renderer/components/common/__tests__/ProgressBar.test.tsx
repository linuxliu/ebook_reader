import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with default props', () => {
    render(<ProgressBar progress={50} />);
    
    const progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('clamps progress value between 0 and 100', () => {
    const { rerender } = render(<ProgressBar progress={-10} />);
    let progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveStyle('width: 0%');

    rerender(<ProgressBar progress={150} />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('shows percentage when showPercentage is true', () => {
    render(<ProgressBar progress={75} showPercentage />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<ProgressBar progress={30} label="Loading files..." />);
    
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  it('shows both label and percentage', () => {
    render(
      <ProgressBar 
        progress={60} 
        label="Processing" 
        showPercentage 
      />
    );
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ProgressBar progress={50} size="sm" />);
    let progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('h-1');

    rerender(<ProgressBar progress={50} size="md" />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('h-2');

    rerender(<ProgressBar progress={50} size="lg" />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('h-3');
  });

  it('applies correct color classes', () => {
    const { rerender } = render(<ProgressBar progress={50} color="primary" />);
    let progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('bg-blue-600');

    rerender(<ProgressBar progress={50} color="success" />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('bg-green-600');

    rerender(<ProgressBar progress={50} color="warning" />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('bg-yellow-600');

    rerender(<ProgressBar progress={50} color="error" />);
    progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('bg-red-600');
  });

  it('applies animation when animated is true', () => {
    render(<ProgressBar progress={50} animated />);
    
    const progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    render(<ProgressBar progress={50} className="custom-progress" />);
    
    const container = screen.getByText('', { selector: '.custom-progress' });
    expect(container).toBeInTheDocument();
  });

  it('rounds percentage display correctly', () => {
    render(<ProgressBar progress={33.7} showPercentage />);
    
    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('handles zero progress correctly', () => {
    render(<ProgressBar progress={0} showPercentage />);
    
    const progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveStyle('width: 0%');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles complete progress correctly', () => {
    render(<ProgressBar progress={100} showPercentage />);
    
    const progressBar = screen.getByTestId('progress-bar-fill');
    expect(progressBar).toHaveStyle('width: 100%');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});