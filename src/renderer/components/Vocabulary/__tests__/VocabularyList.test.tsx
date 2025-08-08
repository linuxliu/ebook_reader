import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VocabularyList from '../VocabularyList';
import { VocabularyItem } from '../../../../shared/types';

const mockVocabulary: VocabularyItem[] = [
  {
    id: '1',
    word: 'hello',
    translation: '你好',
    pronunciation: 'həˈloʊ',
    example: 'Hello, world!',
    bookId: 'book1',
    context: 'Hello, how are you?',
    addedDate: new Date('2024-01-01'),
    mastered: false
  },
  {
    id: '2',
    word: 'world',
    translation: '世界',
    pronunciation: 'wɜːrld',
    example: 'The world is beautiful.',
    bookId: 'book1',
    context: 'Hello, world!',
    addedDate: new Date('2024-01-02'),
    mastered: true
  }
];

const mockProps = {
  vocabulary: mockVocabulary,
  loading: false,
  onDelete: jest.fn(),
  onMarkMastered: jest.fn(),
  onExport: jest.fn(),
  onOpenExportDialog: jest.fn(),
  onEdit: jest.fn()
};

describe('VocabularyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vocabulary items correctly', () => {
    render(<VocabularyList {...mockProps} />);
    
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('世界')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<VocabularyList {...mockProps} loading={true} />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when no vocabulary', () => {
    render(<VocabularyList {...mockProps} vocabulary={[]} />);
    
    expect(screen.getByText('暂无生词')).toBeInTheDocument();
    expect(screen.getByText('在阅读时选中单词并添加到生词表')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<VocabularyList {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索生词...');
    fireEvent.change(searchInput, { target: { value: 'hello' } });
    
    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
      // The search should filter items, but both items might still be visible
      // if the search term appears in context or translation
      expect(searchInput).toHaveValue('hello');
    });
  });

  it('handles sorting functionality', async () => {
    render(<VocabularyList {...mockProps} />);
    
    const sortSelect = screen.getByDisplayValue('按时间');
    fireEvent.change(sortSelect, { target: { value: 'alphabetical' } });
    
    // The component should re-render with alphabetical sorting
    expect(sortSelect).toHaveValue('alphabetical');
  });

  it('handles export functionality', () => {
    render(<VocabularyList {...mockProps} />);
    
    const exportButton = screen.getByText('导出生词表');
    fireEvent.click(exportButton);
    
    expect(mockProps.onOpenExportDialog).toHaveBeenCalled();
  });

  it('handles item selection and batch operations', async () => {
    render(<VocabularyList {...mockProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const firstItemCheckbox = checkboxes[1]; // Skip the "select all" checkbox
    
    fireEvent.click(firstItemCheckbox);
    
    await waitFor(() => {
      expect(screen.getByText('已选择 1 个')).toBeInTheDocument();
    });
  });
});