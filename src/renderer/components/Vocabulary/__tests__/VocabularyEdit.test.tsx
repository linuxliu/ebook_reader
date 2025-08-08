import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VocabularyEdit from '../VocabularyEdit';
import { VocabularyItem } from '../../../../shared/types';

const mockItem: VocabularyItem = {
  id: '1',
  word: 'hello',
  translation: '你好',
  pronunciation: 'həˈloʊ',
  example: 'Hello, world!',
  bookId: 'book1',
  context: 'Hello, how are you?',
  addedDate: new Date('2024-01-01'),
  mastered: false
};

const mockProps = {
  item: mockItem,
  visible: true,
  onSave: jest.fn(),
  onCancel: jest.fn()
};

describe('VocabularyEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders edit form when visible', () => {
    render(<VocabularyEdit {...mockProps} />);
    
    expect(screen.getByText('编辑生词')).toBeInTheDocument();
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('你好')).toBeInTheDocument();
    expect(screen.getByDisplayValue('həˈloʊ')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<VocabularyEdit {...mockProps} visible={false} />);
    
    expect(screen.queryByText('编辑生词')).not.toBeInTheDocument();
  });

  it('shows add form when no item provided', () => {
    render(<VocabularyEdit {...mockProps} item={null} />);
    
    expect(screen.getByText('添加生词')).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    render(<VocabularyEdit {...mockProps} />);
    
    const wordInput = screen.getByDisplayValue('hello');
    fireEvent.change(wordInput, { target: { value: 'world' } });
    
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'world',
          translation: '你好'
        })
      );
    });
  });

  it('handles cancel action', () => {
    render(<VocabularyEdit {...mockProps} />);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<VocabularyEdit {...mockProps} />);
    
    const wordInput = screen.getByDisplayValue('hello');
    fireEvent.change(wordInput, { target: { value: '   ' } }); // Empty with spaces
    
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);
    
    // The validation should prevent the save
    expect(mockProps.onSave).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('handles mastered checkbox toggle', () => {
    render(<VocabularyEdit {...mockProps} />);
    
    const masteredCheckbox = screen.getByRole('checkbox', { name: '已掌握' });
    expect(masteredCheckbox).not.toBeChecked();
    
    fireEvent.click(masteredCheckbox);
    expect(masteredCheckbox).toBeChecked();
  });
});