module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/main'],
  testMatch: [
    '**/src/main/**/__tests__/**/*.+(ts|tsx|js)',
    '**/src/main/**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  collectCoverageFrom: [
    'src/main/**/*.{ts,tsx}',
    '!src/main/**/*.d.ts',
    '!src/main/main.ts',
    '!src/main/preload.ts',
    '!src/main/**/__tests__/**',
    '!src/main/**/*.test.{ts,tsx}',
    '!src/main/**/*.spec.{ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage-main',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^pdfjs-dist/legacy/build/pdf$': '<rootDir>/src/__mocks__/pdfjs-dist.js',
    '^pdfjs-dist/legacy/build/pdf.mjs$': '<rootDir>/src/__mocks__/pdfjs-dist.js',
  },
};