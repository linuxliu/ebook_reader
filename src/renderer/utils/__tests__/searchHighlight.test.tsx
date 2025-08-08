import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { highlightSearchText, matchesSearchQuery, matchesAnyField } from '../searchHighlight';

describe('searchHighlight utilities', () => {
  describe('highlightSearchText', () => {
    it('returns original text when no search query', () => {
      const result = highlightSearchText('Hello World', '');
      expect(result).toBe('Hello World');
    });

    it('highlights single match', () => {
      const result = highlightSearchText('Hello World', 'Hello');
      const { container } = render(<div>{result}</div>);
      
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('Hello');
    });

    it('highlights multiple matches', () => {
      const result = highlightSearchText('Hello Hello World', 'Hello');
      const { container } = render(<div>{result}</div>);
      
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
      marks.forEach(mark => {
        expect(mark).toHaveTextContent('Hello');
      });
    });

    it('is case insensitive', () => {
      const result = highlightSearchText('Hello World', 'hello');
      const { container } = render(<div>{result}</div>);
      
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('Hello');
    });

    it('handles partial matches', () => {
      const result = highlightSearchText('Testing', 'test');
      const { container } = render(<div>{result}</div>);
      
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('Test');
    });
  });

  describe('matchesSearchQuery', () => {
    it('returns true when no search query', () => {
      expect(matchesSearchQuery('Hello World', '')).toBe(true);
    });

    it('returns true for exact match', () => {
      expect(matchesSearchQuery('Hello World', 'Hello')).toBe(true);
    });

    it('returns true for partial match', () => {
      expect(matchesSearchQuery('Hello World', 'Wor')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(matchesSearchQuery('Hello World', 'hello')).toBe(true);
    });

    it('returns false for no match', () => {
      expect(matchesSearchQuery('Hello World', 'xyz')).toBe(false);
    });

    it('handles whitespace in query', () => {
      expect(matchesSearchQuery('Hello World', '  Hello  ')).toBe(true);
    });
  });

  describe('matchesAnyField', () => {
    const fields = ['Hello World', 'Test Book', 'Author Name'];

    it('returns true when no search query', () => {
      expect(matchesAnyField(fields, '')).toBe(true);
    });

    it('returns true when any field matches', () => {
      expect(matchesAnyField(fields, 'Hello')).toBe(true);
      expect(matchesAnyField(fields, 'Book')).toBe(true);
      expect(matchesAnyField(fields, 'Author')).toBe(true);
    });

    it('returns false when no field matches', () => {
      expect(matchesAnyField(fields, 'xyz')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(matchesAnyField(fields, 'hello')).toBe(true);
      expect(matchesAnyField(fields, 'BOOK')).toBe(true);
    });
  });
});