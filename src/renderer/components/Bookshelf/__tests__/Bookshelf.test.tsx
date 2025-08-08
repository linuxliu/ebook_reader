import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Bookshelf from '../Bookshelf';
import { BookMetadata } from '../../../../shared/types';

// Mock timers for debounce testing
jest.useFakeTimers();

// Mock the IPC client
jest.mock('../../../services/IPCClient', () => ({
  ipcClient: {
    importBook: jest.fn()
  }
}));

// Mock book data
const mockBooks: BookMetadata[] = [
  {
    id: '1',
    title: '测试书籍1',
    author: '测试作者1',
    format: 'epub',
    filePath: '/path/to/book1.epub',
    fileSize: 1024000,
    importDate: new Date('2024-01-01'),
    totalPages: 200,
    language: 'zh-CN'
  },
  {
    id: '2',
    title: '测试书籍2',
    author: '测试作者2',
    format: 'pdf',
    filePath: '/path/to/book2.pdf',
    fileSize: 2048000,
    importDate: new Date('2024-01-02'),
    lastReadDate: new Date('2024-01-03'),
    totalPages: 300,
    language: 'zh-CN'
  }
];

const mockProps = {
  books: mockBooks,
  onBookSelect: jest.fn(),
  onBookAdd: jest.fn(),
  onDeleteBook: jest.fn()
};

describe('Bookshelf Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders bookshelf with books', () => {
    render(<Bookshelf {...mockProps} />);
    
    expect(screen.getAllByText('测试书籍1')).toHaveLength(2); // Title appears in both cover and title
    expect(screen.getAllByText('测试书籍2')).toHaveLength(2);
    expect(screen.getByText('共 2 本书籍')).toBeInTheDocument();
  });

  it('shows empty state when no books', () => {
    render(<Bookshelf {...mockProps} books={[]} />);
    
    expect(screen.getByText('书架空空如也')).toBeInTheDocument();
    expect(screen.getByText('导入您的第一本电子书开始阅读之旅')).toBeInTheDocument();
  });

  it('filters books by search query', () => {
    render(<Bookshelf {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索书名或作者...');
    fireEvent.change(searchInput, { target: { value: '测试书籍1' } });
    
    // Advance timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(screen.getAllByText('测试书籍1')).toHaveLength(2); // Title appears in both cover and title
    expect(screen.queryAllByText('测试书籍2')).toHaveLength(0);
    expect(screen.getByText('找到 1 本书籍')).toBeInTheDocument();
  });

  it('highlights search results in book titles and authors', () => {
    render(<Bookshelf {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索书名或作者...');
    fireEvent.change(searchInput, { target: { value: '测试' } });
    
    // Advance timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Check if highlighting elements are present
    const highlightedElements = document.querySelectorAll('mark');
    expect(highlightedElements.length).toBeGreaterThan(0);
  });

  it('shows no results when search has no matches', () => {
    render(<Bookshelf {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索书名或作者...');
    fireEvent.change(searchInput, { target: { value: '不存在的书籍' } });
    
    // Advance timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(screen.getByText('未找到匹配的书籍')).toBeInTheDocument();
    expect(screen.getByText('尝试使用不同的关键词搜索')).toBeInTheDocument();
  });

  it('switches between grid and list view', () => {
    render(<Bookshelf {...mockProps} />);
    
    // Default should be grid view
    const gridContainer = document.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    
    // Switch to list view
    const listViewButton = screen.getByTitle('列表视图');
    fireEvent.click(listViewButton);
    
    // Should now show list view
    const listContainer = document.querySelector('.space-y-2');
    expect(listContainer).toBeInTheDocument();
  });

  it('calls onBookSelect when book is clicked', () => {
    render(<Bookshelf {...mockProps} />);
    
    // Find the book card by its title attribute
    const bookCard = screen.getByTitle('测试书籍1').closest('.group');
    fireEvent.click(bookCard!);
    
    expect(mockProps.onBookSelect).toHaveBeenCalledWith(mockBooks[0]);
  });

  it('shows import button', () => {
    render(<Bookshelf {...mockProps} />);
    
    const importButton = screen.getByRole('button', { name: /导入/ });
    expect(importButton).toBeInTheDocument();
  });

  it('sorts books correctly', () => {
    render(<Bookshelf {...mockProps} />);
    
    // Change sort to title
    const sortSelect = screen.getByTitle('排序方式');
    fireEvent.change(sortSelect, { target: { value: 'title' } });
    
    // Books should be sorted by title - check by title attributes
    const bookTitles = screen.getAllByTitle(/测试书籍/);
    expect(bookTitles[0]).toHaveAttribute('title', '测试书籍1');
    expect(bookTitles[1]).toHaveAttribute('title', '测试书籍2');
  });
});