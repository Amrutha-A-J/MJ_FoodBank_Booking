import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('config FRONTEND_ORIGIN parsing', () => {
  const original = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = original;
    }
    jest.resetModules();
  });

  it('parses comma-separated origins into an array', () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000,http://example.com';
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.frontendOrigins).toEqual([
      'http://localhost:3000',
      'http://example.com',
    ]);
  });
});
