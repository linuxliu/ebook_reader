import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VocabularyList from '../VocabularyList';
import { VocabularyItem } from '../../../../shared/types';

// Mock IPCClient
jest.mock('../../../services/IPCClient', () => ({
  IPCClient: {
    invoke: jest.fn()
  }
}));

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
  }
];

const mockProps = {
  vocabulary: mockVocabulary,
  loading: false,
  onDelete: jest.fn(),
  onMarkMastered: jest.fn(),
  onExport: jest.fn(),
  onEdit: jest.fn()
};

describe('Vocabulary Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders VocabularyList with vocabulary items', () => {
    render(<VocabularyList {...mockProps} />);
    
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('shows empty state when no vocabulary', () => {
    render(<VocabularyList {...mockProps} vocabulary={[]} />);
    
    expect(screen.getByText('暂无生词')).toBeInTheDocument();
  });
});