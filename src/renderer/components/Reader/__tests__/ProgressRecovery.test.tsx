import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProgressRecovery from '../ProgressRecovery';
import { ReadingProgress } from '../../../../shared/types';

const mockCurrentProgress: ReadingProgress = {
  bookId: 'test-book-1',
  currentPage: 50,
  currentChapter: 2,
  percentage: 50,
  position: 'page-50',
  lastUpdateTime: new Date('2024-01-15T10:00:00Z')
};

const mockProgressHistory: ReadingProgress[] = [
  {
    bookId: 'test-book-1',
    currentPage: 45,
    currentChapter: 2,
    percentage: 45,
    position: 'page-45',
    lastUpdateTime: new Date('2024-01-15T09:30:00Z')
  },
  {
    bookId: 'test-book-1',
    currentPage: 40,
    currentChapter: 1,
    percentage: 40,
    position: 'page-40',
    lastUpdateTime: new Date('2024-01-15T09:00:00Z')
  },
  {
    bookId: 'test-book-1',
    currentPage: 35,
    currentChapter: 1,
    percentage: 35,
    position: 'page-35',
    lastUpdateTime: new Date('2024-01-15T08:30:00Z')
  }
];

const defaultProps = {
  progressHistory: mockProgressHistory,
  currentProgress: mockCurrentProgress,
  onRestore: jest.fn(),
  onClose: jest.fn(),
  isVisible: true
};

describe('ProgressRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    expect(screen.getByText('阅读进度恢复')).toBeInTheDocument();
    expect(screen.getByText('选择要恢复的阅读进度版本。系统会自动保存最近的进度记录。')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<ProgressRecovery {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText('阅读进度恢复')).not.toBeInTheDocument();
  });

  it('should display progress history items', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    // Check that all history items are displayed
    expect(screen.getByText('第 45 页 (45%)')).toBeInTheDocument();
    expect(screen.getByText('第 40 页 (40%)')).toBeInTheDocument();
    expect(screen.getByText('第 35 页 (35%)')).toBeInTheDocument();
    
    // Check chapter information
    expect(screen.getByText('第 3 章')).toBeInTheDocument(); // currentChapter + 1
    expect(screen.getAllByText('第 2 章')).toHaveLength(2); // Two items have chapter 2
  });

  it('should show progress differences', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    // First item should show -5 pages and -5% (45 vs 50)
    expect(screen.getByText('-5 页')).toBeInTheDocument();
    expect(screen.getByText('-5%')).toBeInTheDocument();
    
    // Second item should show -10 pages and -10% (40 vs 50)
    expect(screen.getByText('-10 页')).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('should handle progress selection', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    expect(firstProgressItem).toBeInTheDocument();
    
    fireEvent.click(firstProgressItem!);
    
    // Check that selection is indicated
    expect(screen.getByText('将恢复到第 45 页 (45%)')).toBeInTheDocument();
  });

  it('should enable restore button when progress is selected', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    const restoreButton = screen.getByText('恢复进度');
    expect(restoreButton).toBeDisabled();
    
    // Select a progress item
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    fireEvent.click(firstProgressItem!);
    
    expect(restoreButton).toBeEnabled();
  });

  it('should call onRestore when restore button is clicked', async () => {
    const mockOnRestore = jest.fn().mockResolvedValue(undefined);
    render(<ProgressRecovery {...defaultProps} onRestore={mockOnRestore} />);
    
    // Select a progress item
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    fireEvent.click(firstProgressItem!);
    
    // Click restore button
    const restoreButton = screen.getByText('恢复进度');
    fireEvent.click(restoreButton);
    
    await waitFor(() => {
      expect(mockOnRestore).toHaveBeenCalledWith(mockProgressHistory[0]);
    });
  });

  it('should call onClose when restore is successful', async () => {
    const mockOnRestore = jest.fn().mockResolvedValue(undefined);
    const mockOnClose = jest.fn();
    render(<ProgressRecovery {...defaultProps} onRestore={mockOnRestore} onClose={mockOnClose} />);
    
    // Select and restore
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    fireEvent.click(firstProgressItem!);
    
    const restoreButton = screen.getByText('恢复进度');
    fireEvent.click(restoreButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show loading state during restore', async () => {
    const mockOnRestore = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    render(<ProgressRecovery {...defaultProps} onRestore={mockOnRestore} />);
    
    // Select and restore
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    fireEvent.click(firstProgressItem!);
    
    const restoreButton = screen.getByText('恢复进度');
    fireEvent.click(restoreButton);
    
    // Should show loading state
    expect(screen.getByText('恢复中...')).toBeInTheDocument();
    expect(restoreButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText('恢复中...')).not.toBeInTheDocument();
    });
  });

  it('should handle restore errors gracefully', async () => {
    const mockOnRestore = jest.fn().mockRejectedValue(new Error('Restore failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<ProgressRecovery {...defaultProps} onRestore={mockOnRestore} />);
    
    // Select and restore
    const firstProgressItem = screen.getByText('第 45 页 (45%)').closest('div');
    fireEvent.click(firstProgressItem!);
    
    const restoreButton = screen.getByText('恢复进度');
    fireEvent.click(restoreButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore progress:', expect.any(Error));
    });
    
    // Should not close on error
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    // The close button is the one with the X icon (first button in header)
    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show empty state when no history available', () => {
    render(<ProgressRecovery {...defaultProps} progressHistory={[]} />);
    
    expect(screen.getByText('没有可用的进度备份')).toBeInTheDocument();
    
    const restoreButton = screen.getByText('恢复进度');
    expect(restoreButton).toBeDisabled();
  });

  it('should format timestamps correctly', () => {
    render(<ProgressRecovery {...defaultProps} />);
    
    // Check that timestamps are formatted in Chinese locale
    expect(screen.getByText('2024/01/15 17:30')).toBeInTheDocument(); // Assuming UTC+8
  });

  it('should show positive progress differences correctly', () => {
    const historyWithHigherProgress: ReadingProgress[] = [
      {
        bookId: 'test-book-1',
        currentPage: 60, // Higher than current (50)
        currentChapter: 3,
        percentage: 60,
        position: 'page-60',
        lastUpdateTime: new Date('2024-01-15T09:30:00Z')
      }
    ];

    render(<ProgressRecovery 
      {...defaultProps} 
      progressHistory={historyWithHigherProgress}
    />);
    
    expect(screen.getByText('+10 页')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('should handle missing current progress', () => {
    render(<ProgressRecovery 
      {...defaultProps} 
      currentProgress={null}
    />);
    
    // Should still render history items
    expect(screen.getByText('第 45 页 (45%)')).toBeInTheDocument();
    
    // But no progress differences should be shown
    expect(screen.queryByText('-5 页')).not.toBeInTheDocument();
  });
});