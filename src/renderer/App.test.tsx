import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText('电子书阅读器');
    expect(heading).toBeInTheDocument();
  });

  test('renders app info section', () => {
    render(<App />);
    const appInfoSection = screen.getByText('应用信息');
    expect(appInfoSection).toBeInTheDocument();
  });

  test('renders feature modules section', () => {
    render(<App />);
    const featuresSection = screen.getByText('功能模块');
    expect(featuresSection).toBeInTheDocument();
  });
});