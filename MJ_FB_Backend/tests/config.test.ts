import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('config', () => {
  const originalFrontend = process.env.FRONTEND_ORIGIN;
  const originalJwt = process.env.JWT_SECRET;
  const originalRefresh = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    if (originalFrontend === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = originalFrontend;
    }
    if (originalJwt === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwt;
    }
    if (originalRefresh === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalRefresh;
    }
    jest.resetModules();
  });

  it('parses comma-separated origins into an array', () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000,http://example.com';
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_REFRESH_SECRET = 'testrefresh';
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.frontendOrigins).toEqual([
      'http://localhost:3000',
      'http://example.com',
    ]);
  });

  it('throws if JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'testrefresh';
    jest.resetModules();
    expect(() => require('../src/config')).toThrow('JWT_SECRET environment variable is required');
  });

  it('throws if JWT_REFRESH_SECRET is missing', () => {
    process.env.JWT_SECRET = 'testsecret';
    delete process.env.JWT_REFRESH_SECRET;
    jest.resetModules();
    expect(() => require('../src/config')).toThrow(
      'JWT_REFRESH_SECRET environment variable is required',
    );
  });
});
