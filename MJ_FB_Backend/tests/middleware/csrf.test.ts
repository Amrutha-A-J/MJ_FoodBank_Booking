import request from 'supertest';
import express from 'express';
import csrfMiddleware from '../../src/middleware/csrf';

describe('csrf middleware', () => {
  const createApp = () => {
    const app = express();
    app.post('/protected', csrfMiddleware, (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  };

  it('rejects a request missing the CSRF header even when the cookie exists', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/protected')
      .set('Cookie', 'csrfToken=token-from-cookie');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Invalid CSRF token' });
  });

  it('rejects a request when the header token does not match the cookie token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/protected')
      .set('Cookie', 'csrfToken=token-from-cookie')
      .set('x-csrf-token', 'different-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Invalid CSRF token' });
  });

  it('allows the request to continue when the header token matches the cookie token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/protected')
      .set('Cookie', 'csrfToken=matching-token')
      .set('x-csrf-token', 'matching-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
