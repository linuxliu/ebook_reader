import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VocabularyExport from '../VocabularyExport';

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  onExport: jest.fn(),
  totalCount: 10
};

describe('VocabularyExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export dialog when open', () => {
    render(<VocabularyExport {...mockProps} />);
    
    expect(screen.getByText('导出生词表')).toBeInTheDocument();
    expect(screen.getByText('将导出 10 个生词')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<VocabularyExport {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('导出生词表')).not.toBeInTheDocument();
  });

  it('handles format selection', () => {
    render(<VocabularyExport {...mockProps} />);
    
    const txtRadio = screen.getByDisplayValue('txt');
    fireEvent.click(txtRadio);
    
    expect(txtRadio).toBeChecked();
  });

  it('handles export options', () => {
    render(<VocabularyExport {...mockProps} />);
    
    const contextCheckbox = screen.getByLabelText('包含上下文');
    fireEvent.click(contextCheckbox);
    
    expect(contextCheckbox).not.toBeChecked();
  });

  it('handles export action', () => {
    render(<VocabularyExport {...mockProps} />);
    
    const exportButton = screen.getByText('导出');
    fireEvent.click(exportButton);
    
    expect(mockProps.onExport).toHaveBeenCalledWith('csv', expect.any(Object));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles cancel action', () => {
    render(<VocabularyExport {...mockProps} />);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles mutually exclusive filter options', () => {
    render(<VocabularyExport {...mockProps} />);
    
    const masteredCheckbox = screen.getByLabelText('仅导出已掌握的生词');
    const unmasteredCheckbox = screen.getByLabelText('仅导出未掌握的生词');
    
    fireEvent.click(masteredCheckbox);
    expect(masteredCheckbox).toBeChecked();
    expect(unmasteredCheckbox).not.toBeChecked();
    
    fireEvent.click(unmasteredCheckbox);
    expect(unmasteredCheckbox).toBeChecked();
    expect(masteredCheckbox).not.toBeChecked();
  });
});