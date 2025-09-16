import request from 'supertest';
import express from 'express';
import csrfMiddleware from '../src/middleware/csrf';
import { csrfToken } from '../src/controllers/authController';

const app = express();
app.use(express.json());
app.get('/csrf-token', csrfToken);
app.get('/protected', csrfMiddleware, (_req, res) => res.json({ ok: true }));
app.post('/protected', csrfMiddleware, (_req, res) => res.json({ ok: true }));

describe('CSRF middleware', () => {
  it('skips validation for safe methods like GET', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('allows request with valid CSRF token', async () => {
    const tokenRes = await request(app).get('/csrf-token');
    const token = tokenRes.body.csrfToken;
    const cookie = tokenRes.headers['set-cookie'][0].split(';')[0];
    const res = await request(app)
      .post('/protected')
      .set('Cookie', cookie)
      .set('x-csrf-token', token);
    expect(res.status).toBe(200);
  });

  it('rejects request with invalid CSRF token', async () => {
    const tokenRes = await request(app).get('/csrf-token');
    const cookie = tokenRes.headers['set-cookie'][0].split(';')[0];
    const res = await request(app)
      .post('/protected')
      .set('Cookie', cookie)
      .set('x-csrf-token', 'wrong');
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid CSRF token');
  });

  it('rejects request without CSRF token', async () => {
    const res = await request(app).post('/protected');
    expect(res.status).toBe(403);
  });

  it('rejects request with CSRF header but missing cookie', async () => {
    const tokenRes = await request(app).get('/csrf-token');
    const token = tokenRes.body.csrfToken;
    const res = await request(app)
      .post('/protected')
      .set('x-csrf-token', token);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid CSRF token');
  });

  it('sets HttpOnly csrf cookie with 1-hour expiry', async () => {
    const tokenRes = await request(app).get('/csrf-token');
    const cookieHeader = tokenRes.headers['set-cookie'][0];
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toMatch(/Max-Age=3600/);
  });
});
