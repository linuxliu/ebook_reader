module.exports = {
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/e2e/',
    '\\.e2e\\.(test|spec)\\.(js|ts)$'
  ],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    // Mock pdfjs-dist to avoid ES module issues in tests
    '^pdfjs-dist/legacy/build/pdf$': '<rootDir>/src/__mocks__/pdfjs-dist.js',
    '^pdfjs-dist/legacy/build/pdf.mjs$': '<rootDir>/src/__mocks__/pdfjs-dist.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/main.ts',
    '!src/main/preload.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(pdfjs-dist|epubjs)/)',
  ],
};