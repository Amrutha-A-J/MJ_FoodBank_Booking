module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/loadEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript' } },
        module: { type: 'commonjs' },
      },
    ],
  },
};
