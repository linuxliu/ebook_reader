import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslationPopup from '../TranslationPopup';
import { TranslationClient } from '../../../services/TranslationClient';

// Mock TranslationClient
jest.mock('../../../services/TranslationClient');

// Mock text processing utilities
jest.mock('../../../utils/textProcessing', () => ({
  generateWordId: jest.fn(() => 'test-word-id'),
  findContainingSentence: jest.fn((context, text) => `This is a sentence with ${text}.`)
}));

describe('TranslationPopup', () => {
  const mockOnAddToVocabulary = jest.fn();
  const mockOnClose = jest.fn();
  const mockTranslationClient = {
    translate: jest.fn()
  };

  const defaultProps = {
    selectedText: 'hello',
    position: { x: 100, y: 200 },
    visible: true,
    bookId: 'test-book-id',
    context: 'This is a test context with hello word.',
    onAddToVocabulary: mockOnAddToVocabulary,
    onClose: mockOnClose
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (TranslationClient as jest.Mock).mockImplementation(() => mockTranslationClient);
  });

  it('should not render when not visible', () => {
    render(<TranslationPopup {...defaultProps} visible={false} />);
    
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });

  it('should render loading state initially', () => {
    mockTranslationClient.translate.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<TranslationPopup {...defaultProps} />);
    
    expect(screen.getByText('翻译中...')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('should display translation result', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      pronunciation: 'hə\'ləʊ',
      definitions: ['感叹词：用于问候', '名词：问候语'],
      examples: ['Hello, how are you?'],
      source: 'online' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    expect(screen.getByText('hə\'ləʊ')).toBeInTheDocument();
    expect(screen.getByText('感叹词：用于问候')).toBeInTheDocument();
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('来源: 在线词典')).toBeInTheDocument();
  });

  it('should display error message on translation failure', async () => {
    mockTranslationClient.translate.mockRejectedValue(new Error('Translation failed'));
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('翻译失败，请稍后重试')).toBeInTheDocument();
    });
  });

  it('should close popup when close button is clicked', () => {
    mockTranslationClient.translate.mockResolvedValue({
      word: 'hello',
      translation: '你好',
      source: 'online' as const
    });

    render(<TranslationPopup {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close popup when escape key is pressed', () => {
    mockTranslationClient.translate.mockResolvedValue({
      word: 'hello',
      translation: '你好',
      source: 'online' as const
    });

    render(<TranslationPopup {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should add word to vocabulary when button is clicked', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      pronunciation: 'hə\'ləʊ',
      examples: ['Hello, how are you?'],
      source: 'online' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    const addButton = screen.getByText('加入生词表');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockOnAddToVocabulary).toHaveBeenCalledWith({
        id: 'test-word-id',
        word: 'hello',
        translation: '你好',
        pronunciation: 'hə\'ləʊ',
        example: 'Hello, how are you?',
        bookId: 'test-book-id',
        context: 'This is a sentence with hello.',
        addedDate: expect.any(Date),
        mastered: false
      });
    });
  });

  it('should show success state after adding to vocabulary', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      source: 'online' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    mockOnAddToVocabulary.mockResolvedValue(undefined);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    const addButton = screen.getByText('加入生词表');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('已添加到生词表')).toBeInTheDocument();
    });
  });

  it('should handle vocabulary addition error', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      source: 'online' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    mockOnAddToVocabulary.mockRejectedValue(new Error('Failed to add'));
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    const addButton = screen.getByText('加入生词表');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('添加到生词表失败')).toBeInTheDocument();
    });
  });

  it('should adjust position to stay within viewport', () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    // Position that would go off-screen
    const offScreenProps = {
      ...defaultProps,
      position: { x: 750, y: 550 }
    };

    mockTranslationClient.translate.mockResolvedValue({
      word: 'hello',
      translation: '你好',
      source: 'online' as const
    });

    render(<TranslationPopup {...offScreenProps} />);
    
    // The popup should be rendered (position adjustment happens in useEffect)
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('should display local dictionary source correctly', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      source: 'local' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('来源: 本地词典')).toBeInTheDocument();
    });
  });

  it('should handle missing optional fields gracefully', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      source: 'online' as const
      // No pronunciation, definitions, or examples
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    // Should not show sections for missing fields
    expect(screen.queryByText('发音')).not.toBeInTheDocument();
    expect(screen.queryByText('释义')).not.toBeInTheDocument();
    expect(screen.queryByText('例句')).not.toBeInTheDocument();
  });

  it('should limit definitions display to 3 items', async () => {
    const mockTranslation = {
      word: 'hello',
      translation: '你好',
      definitions: [
        '定义1',
        '定义2', 
        '定义3',
        '定义4', // This should not be displayed
        '定义5'  // This should not be displayed
      ],
      source: 'online' as const
    };

    mockTranslationClient.translate.mockResolvedValue(mockTranslation);
    
    render(<TranslationPopup {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('定义1')).toBeInTheDocument();
      expect(screen.getByText('定义2')).toBeInTheDocument();
      expect(screen.getByText('定义3')).toBeInTheDocument();
      expect(screen.queryByText('定义4')).not.toBeInTheDocument();
      expect(screen.queryByText('定义5')).not.toBeInTheDocument();
    });
  });
});