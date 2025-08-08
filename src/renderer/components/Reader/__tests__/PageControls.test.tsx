import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageControls from '../PageControls';

const mockProps = {
  currentPage: 5,
  totalPages: 100,
  onPreviousPage: jest.fn(),
  onNextPage: jest.fn(),
  onGoToPage: jest.fn(),
  isFullscreen: false
};

describe('PageControls Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page controls with current page info', () => {
    render(<PageControls {...mockProps} />);
    
    expect(screen.getByText('5 / 100')).toBeInTheDocument();
    expect(screen.getByTitle('上一页 (←)')).toBeInTheDocument();
    expect(screen.getByTitle('下一页 (→)')).toBeInTheDocument();
  });

  it('handles previous page click', () => {
    render(<PageControls {...mockProps} />);
    
    const prevButton = screen.getByTitle('上一页 (←)');
    fireEvent.click(prevButton);
    
    expect(mockProps.onPreviousPage).toHaveBeenCalled();
  });

  it('handles next page click', () => {
    render(<PageControls {...mockProps} />);
    
    const nextButton = screen.getByTitle('下一页 (→)');
    fireEvent.click(nextButton);
    
    expect(mockProps.onNextPage).toHaveBeenCalled();
  });

  it('disables previous button on first page', () => {
    const propsFirstPage = { ...mockProps, currentPage: 1 };
    render(<PageControls {...propsFirstPage} />);
    
    const prevButton = screen.getByTitle('上一页 (←)');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const propsLastPage = { ...mockProps, currentPage: 100 };
    render(<PageControls {...propsLastPage} />);
    
    const nextButton = screen.getByTitle('下一页 (→)');
    expect(nextButton).toBeDisabled();
  });

  it('shows page jump input when page info is clicked', () => {
    render(<PageControls {...mockProps} />);
    
    const pageInfo = screen.getByText('5 / 100');
    fireEvent.click(pageInfo);
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('handles page jump submission', () => {
    render(<PageControls {...mockProps} />);
    
    const pageInfo = screen.getByText('5 / 100');
    fireEvent.click(pageInfo);
    
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(mockProps.onGoToPage).toHaveBeenCalledWith(25);
  });

  it('shows keyboard shortcuts in fullscreen mode', () => {
    const fullscreenProps = { ...mockProps, isFullscreen: true };
    render(<PageControls {...fullscreenProps} />);
    
    expect(screen.getByText('← → 翻页 | F11 退出全屏 | ESC 退出')).toBeInTheDocument();
  });

  it('has reduced opacity in fullscreen mode', () => {
    const fullscreenProps = { ...mockProps, isFullscreen: true };
    render(<PageControls {...fullscreenProps} />);
    
    const controls = document.querySelector('.page-controls');
    expect(controls).toHaveClass('opacity-0');
  });
});