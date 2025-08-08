import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPanel from '../SettingsPanel';
import { ReadingSettings } from '../../../../shared/types';

// Mock settings data
const mockSettings: ReadingSettings = {
  bookId: 'test-book-1',
  fontFamily: 'SimSun, serif',
  fontSize: 16,
  lineHeight: 1.6,
  margin: 20,
  theme: 'light',
  pageMode: 'pagination'
};

describe('SettingsPanel', () => {
  const mockOnSettingsChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings panel with correct initial values', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('阅读设置')).toBeInTheDocument();
    const fontSelect = screen.getByRole('combobox');
    expect(fontSelect).toHaveValue('SimSun, serif');
    expect(screen.getByText('字号: 16px')).toBeInTheDocument();
    expect(screen.getByText('行间距: 1.6')).toBeInTheDocument();
    expect(screen.getByText('页面边距: 20px')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when "完成" button is clicked', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const completeButton = screen.getByRole('button', { name: '完成' });
    fireEvent.click(completeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates font family when dropdown selection changes', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const fontSelect = screen.getByRole('combobox');
    fireEvent.change(fontSelect, { target: { value: 'Microsoft YaHei, sans-serif' } });

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        fontFamily: 'Microsoft YaHei, sans-serif'
      });
    });
  });

  it('updates font size when slider changes', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const fontSizeSlider = screen.getByRole('slider', { name: /字号/i });
    fireEvent.change(fontSizeSlider, { target: { value: '20' } });

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        fontSize: 20
      });
    });
  });

  it('updates line height when slider changes', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const lineHeightSlider = screen.getByRole('slider', { name: /行间距/i });
    fireEvent.change(lineHeightSlider, { target: { value: '2.0' } });

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        lineHeight: 2.0
      });
    });
  });

  it('updates margin when slider changes', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const marginSlider = screen.getByRole('slider', { name: /页面边距/i });
    fireEvent.change(marginSlider, { target: { value: '30' } });

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        margin: 30
      });
    });
  });

  it('updates theme when theme button is clicked', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const darkThemeButton = screen.getByRole('button', { name: /深色/i });
    fireEvent.click(darkThemeButton);

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        theme: 'dark'
      });
    });
  });

  it('updates page mode when mode button is clicked', async () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const scrollModeButton = screen.getByRole('button', { name: /滚动模式/i });
    fireEvent.click(scrollModeButton);

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        pageMode: 'scroll'
      });
    });
  });

  it('resets to default settings when reset button is clicked', async () => {
    const customSettings: ReadingSettings = {
      bookId: 'test-book-1',
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      lineHeight: 2.0,
      margin: 40,
      theme: 'dark',
      pageMode: 'scroll'
    };

    render(
      <SettingsPanel
        settings={customSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const resetButton = screen.getByRole('button', { name: '重置默认' });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        bookId: 'test-book-1',
        fontFamily: 'SimSun, serif',
        fontSize: 16,
        lineHeight: 1.6,
        margin: 20,
        theme: 'light',
        pageMode: 'pagination'
      });
    });
  });

  it('shows preview panel when showPreview is true', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
        showPreview={true}
      />
    );

    expect(screen.getByText('预览效果')).toBeInTheDocument();
    expect(screen.getByText('示例文本')).toBeInTheDocument();
  });

  it('hides preview panel when showPreview is false', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
        showPreview={false}
      />
    );

    expect(screen.queryByText('预览效果')).not.toBeInTheDocument();
    expect(screen.queryByText('示例文本')).not.toBeInTheDocument();
  });

  it('applies correct styles to preview panel based on settings', () => {
    const darkSettings: ReadingSettings = {
      ...mockSettings,
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      lineHeight: 1.8,
      margin: 25,
      theme: 'dark'
    };

    render(
      <SettingsPanel
        settings={darkSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
        showPreview={true}
      />
    );

    const previewContent = screen.getByText('示例文本').parentElement;
    expect(previewContent).toHaveStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      lineHeight: '1.8',
      margin: '25px',
      backgroundColor: '#1f2937',
      color: '#f9fafb'
    });
  });

  it('validates font size range (12-32px, step 2px)', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const fontSizeSlider = screen.getByRole('slider', { name: /字号/i });
    expect(fontSizeSlider).toHaveAttribute('min', '12');
    expect(fontSizeSlider).toHaveAttribute('max', '32');
    expect(fontSizeSlider).toHaveAttribute('step', '2');
  });

  it('validates line height range (1.0-3.0, step 0.1)', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const lineHeightSlider = screen.getByRole('slider', { name: /行间距/i });
    expect(lineHeightSlider).toHaveAttribute('min', '1.0');
    expect(lineHeightSlider).toHaveAttribute('max', '3.0');
    expect(lineHeightSlider).toHaveAttribute('step', '0.1');
  });

  it('validates margin range (10-60px, step 5px)', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onClose={mockOnClose}
      />
    );

    const marginSlider = screen.getByRole('slider', { name: /页面边距/i });
    expect(marginSlider).toHaveAttribute('min', '10');
    expect(marginSlider).toHaveAttribute('max', '60');
    expect(marginSlider).toHaveAttribute('step', '5');
  });
});