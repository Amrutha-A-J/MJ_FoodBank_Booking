module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '<rootDir>/src/pages/admin/__tests__/**/*.test.tsx',
    '<rootDir>/src/pages/**/__tests__/**/*.test.tsx',
    '<rootDir>/src/__tests__/**/*.test.tsx',
    '<rootDir>/src/api/__tests__/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.css\\?url$': '<rootDir>/testUtils/fileMock.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        useESM: true,
        diagnostics: false,
      },
    ],
  },
};
