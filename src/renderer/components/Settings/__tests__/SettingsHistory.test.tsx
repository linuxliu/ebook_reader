import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsHistory from '../SettingsHistory';
import { ReadingSettings } from '../../../../shared/types';

// Mock settings data
const mockCurrentSettings: ReadingSettings = {
  bookId: 'test-book-1',
  fontFamily: 'SimSun, serif',
  fontSize: 16,
  lineHeight: 1.6,
  margin: 20,
  theme: 'light',
  pageMode: 'pagination'
};

const mockHistory: ReadingSettings[] = [
  {
    bookId: 'test-book-1',
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.4,
    margin: 15,
    theme: 'dark',
    pageMode: 'scroll'
  },
  {
    bookId: 'test-book-1',
    fontFamily: 'Times New Roman, serif',
    fontSize: 18,
    lineHeight: 1.8,
    margin: 25,
    theme: 'light',
    pageMode: 'pagination'
  },
  mockCurrentSettings // Current settings in history
];

describe('SettingsHistory', () => {
  const mockOnRestore = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders settings history when visible', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('设置历史')).toBeInTheDocument();
    expect(screen.getByText('历史设置 #1')).toBeInTheDocument();
    expect(screen.getByText('历史设置 #2')).toBeInTheDocument();
    expect(screen.getByText('历史设置 #3')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    render(
      <SettingsHistory
        history={[]}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('暂无设置历史记录')).toBeInTheDocument();
  });

  it('marks current settings correctly', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('(当前)')).toBeInTheDocument();
  });

  it('shows restore button for non-current settings', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const restoreButtons = screen.getAllByText('恢复');
    expect(restoreButtons).toHaveLength(2); // Two non-current settings
  });

  it('calls onRestore when restore button is clicked', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const restoreButtons = screen.getAllByText('恢复');
    fireEvent.click(restoreButtons[0]);

    expect(mockOnRestore).toHaveBeenCalledWith(mockHistory[0]);
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when footer close button is clicked', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const footerCloseButtons = screen.getAllByRole('button', { name: '关闭' });
    fireEvent.click(footerCloseButtons[1]); // Footer button is the second one

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays settings details correctly', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    // Check first history item details
    expect(screen.getByText('字体: Arial')).toBeInTheDocument();
    expect(screen.getByText('字号: 14px')).toBeInTheDocument();
    expect(screen.getByText('行距: 1.4')).toBeInTheDocument();
    expect(screen.getByText('边距: 15px')).toBeInTheDocument();
    expect(screen.getByText('主题: 深色')).toBeInTheDocument();
    expect(screen.getByText('模式: 滚动')).toBeInTheDocument();
  });

  it('formats settings preview correctly', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('Arial 14px, 行距1.4, 深色主题')).toBeInTheDocument();
    expect(screen.getByText('Times New Roman 18px, 行距1.8, 浅色主题')).toBeInTheDocument();
  });

  it('applies correct styling to current settings', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const currentSettingsItem = screen.getByText('历史设置 #3').closest('.p-3');
    expect(currentSettingsItem).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('applies correct styling to non-current settings', () => {
    render(
      <SettingsHistory
        history={mockHistory}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const nonCurrentSettingsItem = screen.getByText('历史设置 #1').closest('.p-3');
    expect(nonCurrentSettingsItem).toHaveClass('border-gray-200');
    expect(nonCurrentSettingsItem).not.toHaveClass('border-blue-500');
  });

  it('handles different theme values correctly', () => {
    const historyWithDarkTheme: ReadingSettings[] = [
      {
        ...mockCurrentSettings,
        theme: 'dark'
      }
    ];

    render(
      <SettingsHistory
        history={historyWithDarkTheme}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('主题: 深色')).toBeInTheDocument();
  });

  it('handles different page mode values correctly', () => {
    const historyWithScrollMode: ReadingSettings[] = [
      {
        ...mockCurrentSettings,
        pageMode: 'scroll'
      }
    ];

    render(
      <SettingsHistory
        history={historyWithScrollMode}
        currentSettings={mockCurrentSettings}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('模式: 滚动')).toBeInTheDocument();
  });
});