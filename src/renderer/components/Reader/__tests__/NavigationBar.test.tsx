import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NavigationBar from '../NavigationBar';

describe('NavigationBar', () => {
  const defaultProps = {
    currentPage: 15,
    totalPages: 100,
    currentChapter: '第二章：发展',
    progress: 15,
    onGoToPage: jest.fn(),
    onToggleToc: jest.fn(),
    isFullscreen: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation bar with current page info', () => {
    render(<NavigationBar {...defaultProps} />);
    
    expect(screen.getByText('第 15 页 / 共 100 页')).toBeInTheDocument();
    expect(screen.getByText('第二章：发展')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('shows TOC toggle button', () => {
    render(<NavigationBar {...defaultProps} />);
    
    const tocButton = screen.getByTitle('显示目录');
    expect(tocButton).toBeInTheDocument();
  });

  it('calls onToggleToc when TOC button is clicked', () => {
    render(<NavigationBar {...defaultProps} />);
    
    const tocButton = screen.getByTitle('显示目录');
    fireEvent.click(tocButton);
    
    expect(defaultProps.onToggleToc).toHaveBeenCalled();
  });

  it('shows page input when page info is clicked', () => {
    render(<NavigationBar {...defaultProps} />);
    
    const pageInfo = screen.getByText('第 15 页 / 共 100 页');
    fireEvent.click(pageInfo);
    
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
  });

  it('calls onGoToPage when page input is submitted', () => {
    render(<NavigationBar {...defaultProps} />);
    
    // Click to show input
    const pageInfo = screen.getByText('第 15 页 / 共 100 页');
    fireEvent.click(pageInfo);
    
    // Change input value
    const input = screen.getByDisplayValue('15');
    fireEvent.change(input, { target: { value: '25' } });
    
    // Submit form
    fireEvent.submit(input.closest('form')!);
    
    expect(defaultProps.onGoToPage).toHaveBeenCalledWith(25);
  });

  it('hides page input on escape key', () => {
    render(<NavigationBar {...defaultProps} />);
    
    // Show input
    const pageInfo = screen.getByText('第 15 页 / 共 100 页');
    fireEvent.click(pageInfo);
    
    const input = screen.getByDisplayValue('15');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Input should be hidden, page info should be back
    expect(screen.getByText('第 15 页 / 共 100 页')).toBeInTheDocument();
  });

  it('handles progress bar click', () => {
    render(<NavigationBar {...defaultProps} />);
    
    const progressBar = screen.getByTitle('阅读进度 15%');
    
    // Mock getBoundingClientRect
    jest.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      right: 200,
      bottom: 20,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    
    // Click at 50% position (100px from left)
    fireEvent.mouseDown(progressBar, { clientX: 100 });
    
    expect(defaultProps.onGoToPage).toHaveBeenCalledWith(50);
  });

  it('shows fullscreen styling when isFullscreen is true', () => {
    render(<NavigationBar {...defaultProps} isFullscreen={true} />);
    
    const navBar = screen.getByText('第二章：发展').closest('.navigation-bar');
    expect(navBar).toHaveClass('fixed', 'bottom-0', 'bg-black', 'bg-opacity-75');
  });

  it('shows keyboard shortcuts hint in fullscreen', () => {
    render(<NavigationBar {...defaultProps} isFullscreen={true} />);
    
    expect(screen.getByText('点击进度条跳转 | ← → 翻页 | ESC 退出全屏')).toBeInTheDocument();
  });

  it('validates page input range', () => {
    render(<NavigationBar {...defaultProps} />);
    
    // Show input
    const pageInfo = screen.getByText('第 15 页 / 共 100 页');
    fireEvent.click(pageInfo);
    
    // Try to enter invalid page number
    const input = screen.getByDisplayValue('15');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.submit(input.closest('form')!);
    
    // Should not call onGoToPage with invalid page
    expect(defaultProps.onGoToPage).not.toHaveBeenCalledWith(150);
  });

  it('handles progress bar dragging', () => {
    render(<NavigationBar {...defaultProps} />);
    
    const progressBar = screen.getByTitle('阅读进度 15%');
    
    // Mock getBoundingClientRect
    jest.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      right: 200,
      bottom: 20,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    
    // Start dragging
    fireEvent.mouseDown(progressBar, { clientX: 50 });
    
    // Move while dragging
    fireEvent.mouseMove(progressBar, { clientX: 100 });
    
    // Should call onGoToPage for the new position
    expect(defaultProps.onGoToPage).toHaveBeenCalledWith(50);
  });
});