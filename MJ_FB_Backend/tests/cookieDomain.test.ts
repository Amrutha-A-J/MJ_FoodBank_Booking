import request from 'supertest';

jest.setTimeout(15000);

afterEach(() => {
  const cron = require('node-cron');
  for (const task of cron.getTasks().values()) {
    task.stop();
  }
  jest.resetModules();
});

// Ensure cookie domain isn't applied in non-production environments
// even if COOKIE_DOMAIN is set.
describe('auth cookies in non-production', () => {
  test('csrf cookie omits domain in development', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.COOKIE_DOMAIN = 'example.com';
      process.env.NODE_ENV = 'development';
      const { default: app } = await import('../src/app');
      const res = await request(app).get('/api/v1/auth/csrf-token');
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).not.toMatch(/Domain=example\.com/);
      delete process.env.COOKIE_DOMAIN;
      process.env.NODE_ENV = 'test';
    });
  });

  test('refresh token cookie omits domain in development', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.COOKIE_DOMAIN = 'example.com';
      process.env.NODE_ENV = 'development';
      const { default: issueAuthTokens } = await import('../src/utils/authUtils');
      const express = (await import('express')).default;
      const app = express();
      app.post('/login', async (_req, res) => {
        await issueAuthTokens(res, { id: 1, role: 'user', type: 'user' }, 'user:1');
        res.end();
      });
      const res = await request(app).post('/login');
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).not.toMatch(/Domain=example\.com/);
      delete process.env.COOKIE_DOMAIN;
      process.env.NODE_ENV = 'test';
    });
  });
});
