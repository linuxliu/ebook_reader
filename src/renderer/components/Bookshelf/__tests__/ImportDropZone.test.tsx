import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportDropZone from '../ImportDropZone';
import { BookMetadata, AppError, ErrorType } from '../../../../shared/types';

// Mock the IPC client
jest.mock('../../../services/IPCClient', () => ({
  ipcClient: {
    importBook: jest.fn()
  }
}));

const mockBook: BookMetadata = {
  id: 'test-book-1',
  title: '测试书籍',
  author: '测试作者',
  format: 'epub' as const,
  filePath: '/path/to/test.epub',
  fileSize: 1024000,
  importDate: new Date(),
  totalPages: 100,
  language: 'zh-CN'
};

describe('ImportDropZone', () => {
  const mockOnImportSuccess = jest.fn();
  const mockOnImportError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows drag overlay when dragging over', () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: []
      }
    });

    expect(screen.getByText('释放以导入电子书')).toBeInTheDocument();
    expect(screen.getByText('支持 EPUB、PDF、MOBI、TXT 格式')).toBeInTheDocument();
  });

  it('handles valid file drop', async () => {
    const { ipcClient } = require('../../../services/IPCClient');
    ipcClient.importBook.mockResolvedValue(mockBook);

    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Create a mock file
    const file = new File(['test content'], 'test.epub', { type: 'application/epub+zip' });
    Object.defineProperty(file, 'path', { value: '/path/to/test.epub' });

    // Simulate file drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(ipcClient.importBook).toHaveBeenCalledWith('/path/to/test.epub');
    });

    await waitFor(() => {
      expect(mockOnImportSuccess).toHaveBeenCalledWith(mockBook);
    });
  });

  it('rejects unsupported file formats', async () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Create a mock file with unsupported format
    const file = new File(['test content'], 'test.doc', { type: 'application/msword' });
    Object.defineProperty(file, 'path', { value: '/path/to/test.doc' });

    // Simulate file drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockOnImportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.UNSUPPORTED_FORMAT,
          message: expect.stringContaining('不支持的文件格式: doc')
        })
      );
    });
  });

  it('rejects files that are too large', async () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Create a mock file that's too large (over 100MB)
    const file = new File(['test content'], 'test.epub', { type: 'application/epub+zip' });
    Object.defineProperty(file, 'size', { value: 150 * 1024 * 1024 }); // 150MB
    Object.defineProperty(file, 'path', { value: '/path/to/test.epub' });

    // Simulate file drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockOnImportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.STORAGE_FULL,
          message: expect.stringContaining('文件过大')
        })
      );
    });
  });

  it('rejects multiple files', async () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Create multiple mock files
    const file1 = new File(['test content 1'], 'test1.epub', { type: 'application/epub+zip' });
    const file2 = new File(['test content 2'], 'test2.epub', { type: 'application/epub+zip' });

    // Simulate multiple file drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file1, file2]
      }
    });

    await waitFor(() => {
      expect(mockOnImportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.PARSE_ERROR,
          message: '一次只能导入一个文件'
        })
      );
    });
  });

  it('handles empty file drop', async () => {
    render(
      <ImportDropZone
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      >
        <div data-testid="child-content">Test Content</div>
      </ImportDropZone>
    );

    const dropZone = screen.getByTestId('child-content').parentElement;
    
    // Simulate empty file drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: []
      }
    });

    await waitFor(() => {
      expect(mockOnImportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.FILE_NOT_FOUND,
          message: '没有检测到有效的文件'
        })
      );
    });
  });
});