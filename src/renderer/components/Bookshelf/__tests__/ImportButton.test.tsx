import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportButton from '../ImportButton';
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

const mockError: AppError = {
  type: ErrorType.PARSE_ERROR,
  message: '导入失败',
  timestamp: new Date(),
  recoverable: true
};

describe('ImportButton', () => {
  const mockOnImportSuccess = jest.fn();
  const mockOnImportError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders import button correctly', () => {
    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('导入书籍')).toBeInTheDocument();
  });

  it('shows disabled state when disabled prop is true', () => {
    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
        disabled={true}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles successful import', async () => {
    const { ipcClient } = require('../../../services/IPCClient');
    ipcClient.importBook.mockResolvedValue(mockBook);

    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show importing state
    await waitFor(() => {
      expect(screen.getByText('选择文件...')).toBeInTheDocument();
    });

    // Wait for import to complete
    await waitFor(() => {
      expect(mockOnImportSuccess).toHaveBeenCalledWith(mockBook);
    }, { timeout: 3000 });
  });

  it('handles import error', async () => {
    const { ipcClient } = require('../../../services/IPCClient');
    ipcClient.importBook.mockRejectedValue(mockError);

    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Wait for error to be handled
    await waitFor(() => {
      expect(mockOnImportError).toHaveBeenCalledWith(mockError);
    }, { timeout: 5000 });
  });

  it('handles user cancellation', async () => {
    const { ipcClient } = require('../../../services/IPCClient');
    ipcClient.importBook.mockResolvedValue(null);

    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Wait for cancellation to be handled
    await waitFor(() => {
      expect(mockOnImportSuccess).not.toHaveBeenCalled();
      expect(mockOnImportError).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('prevents multiple simultaneous imports', async () => {
    const { ipcClient } = require('../../../services/IPCClient');
    ipcClient.importBook.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockBook), 1000)));

    render(
      <ImportButton
        onImportSuccess={mockOnImportSuccess}
        onImportError={mockOnImportError}
      />
    );

    const button = screen.getByRole('button');
    
    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only call importBook once
    expect(ipcClient.importBook).toHaveBeenCalledTimes(1);
  });
});