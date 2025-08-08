import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TableOfContents from '../TableOfContents';
import { TableOfContent } from '../../../../shared/types';

const mockToc: TableOfContent[] = [
  {
    id: '1',
    title: '第一章：开始',
    level: 1,
    page: 1,
    children: [
      {
        id: '1.1',
        title: '1.1 引言',
        level: 2,
        page: 2
      },
      {
        id: '1.2',
        title: '1.2 背景',
        level: 2,
        page: 5
      }
    ]
  },
  {
    id: '2',
    title: '第二章：发展',
    level: 1,
    page: 10
  },
  {
    id: '3',
    title: '第三章：结论',
    level: 1,
    page: 20
  }
];

describe('TableOfContents', () => {
  const defaultProps = {
    toc: mockToc,
    currentPage: 3,
    isVisible: true,
    onToggle: jest.fn(),
    onChapterSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table of contents with chapters', () => {
    render(<TableOfContents {...defaultProps} />);
    
    expect(screen.getByText('目录')).toBeInTheDocument();
    expect(screen.getByText('第一章：开始')).toBeInTheDocument();
    expect(screen.getByText('第二章：发展')).toBeInTheDocument();
    expect(screen.getByText('第三章：结论')).toBeInTheDocument();
  });

  it('shows current page position', () => {
    render(<TableOfContents {...defaultProps} />);
    
    expect(screen.getByText('当前位置：第 3 页')).toBeInTheDocument();
  });

  it('highlights current chapter', () => {
    render(<TableOfContents {...defaultProps} />);
    
    // Chapter 1 should be highlighted as current page (3) is within its range
    const chapter1 = screen.getByText('第一章：开始').closest('.toc-item');
    expect(chapter1?.querySelector('.bg-blue-100')).toBeInTheDocument();
  });

  it('calls onChapterSelect when chapter is clicked', () => {
    render(<TableOfContents {...defaultProps} />);
    
    fireEvent.click(screen.getByText('第二章：发展'));
    
    expect(defaultProps.onChapterSelect).toHaveBeenCalledWith(10);
  });

  it('expands and collapses chapters with children', () => {
    render(<TableOfContents {...defaultProps} />);
    
    // Initially, children should not be visible
    expect(screen.queryByText('1.1 引言')).not.toBeInTheDocument();
    
    // Click the expand button
    const expandButton = screen.getByText('第一章：开始').closest('.toc-item')?.querySelector('button');
    if (expandButton) {
      fireEvent.click(expandButton);
    }
    
    // Now children should be visible
    expect(screen.getByText('1.1 引言')).toBeInTheDocument();
    expect(screen.getByText('1.2 背景')).toBeInTheDocument();
  });

  it('calls onToggle when close button is clicked', () => {
    render(<TableOfContents {...defaultProps} />);
    
    const closeButton = screen.getByTitle('关闭目录');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('shows empty state when no TOC is available', () => {
    render(<TableOfContents {...defaultProps} toc={[]} />);
    
    expect(screen.getByText('暂无目录')).toBeInTheDocument();
  });

  it('is hidden when isVisible is false', () => {
    render(<TableOfContents {...defaultProps} isVisible={false} />);
    
    const sidebar = screen.getByText('目录').closest('div')?.parentElement;
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('calls onToggle when backdrop is clicked', () => {
    render(<TableOfContents {...defaultProps} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('handles nested chapters correctly', () => {
    render(<TableOfContents {...defaultProps} />);
    
    // Expand first chapter
    const expandButton = screen.getByText('第一章：开始').closest('.toc-item')?.querySelector('button');
    if (expandButton) {
      fireEvent.click(expandButton);
    }
    
    // Click on nested chapter
    fireEvent.click(screen.getByText('1.1 引言'));
    
    expect(defaultProps.onChapterSelect).toHaveBeenCalledWith(2);
  });

  it('shows page numbers for each chapter', () => {
    render(<TableOfContents {...defaultProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });
});