import { afterEach, describe, expect, it, jest } from '@jest/globals';

// Ensure logger mock is used, and environment variables are reset after each test.
describe('config invalid environment variables', () => {
  const originalPgUser = process.env.PG_USER;
  const originalPgPort = process.env.PG_PORT;

  afterEach(() => {
    if (originalPgUser === undefined) {
      delete process.env.PG_USER;
    } else {
      process.env.PG_USER = originalPgUser;
    }
    if (originalPgPort === undefined) {
      delete process.env.PG_PORT;
    } else {
      process.env.PG_PORT = originalPgPort;
    }
    jest.resetModules();
  });

  it('logs an error and throws when env vars are missing or malformed', () => {
    delete process.env.PG_USER;
    process.env.PG_PORT = 'not-a-number';

    const logger = require('../src/utils/logger').default;
    (logger.error as jest.Mock).mockReset();

    expect(() => require('../src/config')).toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      '❌ Invalid or missing environment variables:',
      expect.any(Object)
    );
  });
});
