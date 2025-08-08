import '@testing-library/jest-dom';

// 全局测试设置
beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

// Mock Electron APIs
global.window = global.window || {};
global.window.electronAPI = {
  importBook: jest.fn(),
  getBooks: jest.fn(),
  openBook: jest.fn(),
  saveProgress: jest.fn(),
  getProgress: jest.fn(),
  addVocabulary: jest.fn(),
  getVocabulary: jest.fn(),
  translateText: jest.fn(),
  exportVocabulary: jest.fn(),
  saveSettings: jest.fn(),
  getSettings: jest.fn(),
  clearCache: jest.fn(),
  onProgressUpdate: jest.fn(),
  onError: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});