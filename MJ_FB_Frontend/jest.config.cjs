module.exports = {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  testMatch: [
    '<rootDir>/src/pages/admin/__tests__/**/*.test.tsx',
    '<rootDir>/src/pages/**/__tests__/**/*.test.tsx',
    '<rootDir>/src/__tests__/**/*.test.tsx',
    '<rootDir>/src/api/__tests__/**/*.test.ts',
    '<rootDir>/src/hooks/**/*.test.tsx',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  setupFiles: ['<rootDir>/loadEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.css\\?url$': '<rootDir>/testUtils/fileMock.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
        module: { type: 'es6' },
      },
    ],
  },
};
