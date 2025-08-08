import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Reader from '../Reader';
import { BookMetadata, BookContent, ReadingProgress, ReadingSettings } from '../../../../shared/types';

// Mock data
const mockBook: BookMetadata = {
  id: 'test-book-1',
  title: 'Test Book',
  author: 'Test Author',
  format: 'epub',
  filePath: '/path/to/book.epub',
  fileSize: 1024000,
  importDate: new Date('2024-01-01'),
  totalPages: 100,
  language: 'zh-CN'
};

const mockContent: BookContent = {
  bookId: 'test-book-1',
  chapters: [
    {
      id: 'chapter-1',
      title: 'Chapter 1',
      content: '<p>This is the first chapter content.</p>',
      pageCount: 50,
      startPage: 1
    },
    {
      id: 'chapter-2',
      title: 'Chapter 2',
      content: '<p>This is the second chapter content.</p>',
      pageCount: 50,
      startPage: 51
    }
  ],
  toc: [
    {
      id: 'toc-1',
      title: 'Chapter 1',
      level: 1,
      page: 1
    },
    {
      id: 'toc-2',
      title: 'Chapter 2',
      level: 1,
      page: 51
    }
  ],
  rawContent: 'Raw content here'
};

const mockProgress: ReadingProgress = {
  bookId: 'test-book-1',
  currentPage: 1,
  currentChapter: 0,
  percentage: 1,
  position: 'page-1',
  lastUpdateTime: new Date()
};

const mockSettings: ReadingSettings = {
  bookId: 'test-book-1',
  fontFamily: 'Arial',
  fontSize: 16,
  lineHeight: 1.6,
  margin: 20,
  theme: 'light',
  pageMode: 'pagination'
};

const mockProps = {
  book: mockBook,
  content: mockContent,
  progress: mockProgress,
  settings: mockSettings,
  onProgressChange: jest.fn(),
  onSettingsChange: jest.fn(),
  onClose: jest.fn()
};

describe('Reader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reader with book title and content', () => {
    render(<Reader {...mockProps} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
  });

  it('displays current page and total pages', () => {
    render(<Reader {...mockProps} />);
    
    expect(screen.getByText(/第 1 页 \/ 共 100 页/)).toBeInTheDocument();
    expect(screen.getByText('1 / 100')).toBeInTheDocument();
  });

  it('handles page navigation', () => {
    render(<Reader {...mockProps} />);
    
    const nextButton = screen.getByTitle('下一页 (→)');
    fireEvent.click(nextButton);
    
    expect(mockProps.onProgressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2,
        percentage: 2
      })
    );
  });

  it('handles keyboard navigation', () => {
    render(<Reader {...mockProps} />);
    
    // Test right arrow key
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(mockProps.onProgressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2
      })
    );
    
    // Test left arrow key
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(mockProps.onProgressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1
      })
    );
  });

  it('handles fullscreen toggle', () => {
    render(<Reader {...mockProps} />);
    
    const fullscreenButton = screen.getByTitle('全屏模式 (F11)');
    fireEvent.click(fullscreenButton);
    
    // Check if fullscreen controls appear
    expect(screen.getByTitle('退出全屏 (ESC)')).toBeInTheDocument();
  });

  it('handles close button', () => {
    render(<Reader {...mockProps} />);
    
    const closeButton = screen.getByTitle('返回书架');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('prevents navigation beyond book boundaries', () => {
    const propsAtStart = { ...mockProps, progress: { ...mockProgress, currentPage: 1 } };
    const { rerender } = render(<Reader {...propsAtStart} />);
    
    const prevButton = screen.getByTitle('上一页 (←)');
    expect(prevButton).toBeDisabled();
    
    const propsAtEnd = { ...mockProps, progress: { ...mockProgress, currentPage: 100 } };
    rerender(<Reader {...propsAtEnd} />);
    
    const nextButton = screen.getByTitle('下一页 (→)');
    expect(nextButton).toBeDisabled();
  });

  it('applies reading settings to content', () => {
    const customSettings = {
      ...mockSettings,
      fontSize: 20,
      fontFamily: 'Times New Roman',
      lineHeight: 1.8
    };
    
    render(<Reader {...mockProps} settings={customSettings} />);
    
    const readerContainer = document.querySelector('.reader-container');
    expect(readerContainer).toHaveStyle({
      fontFamily: 'Times New Roman',
      fontSize: '20px',
      lineHeight: '1.8'
    });
  });
});