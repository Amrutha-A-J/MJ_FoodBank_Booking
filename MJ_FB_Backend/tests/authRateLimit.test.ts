import request from 'supertest';
import express from 'express';
import authRouter, { authLimiter } from '../src/routes/auth';
import { resendLimit } from '../src/controllers/authController';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

beforeEach(() => {
  authLimiter.resetKey('::ffff:127.0.0.1');
  authLimiter.resetKey('127.0.0.1');
  resendLimit.clear();
});

describe('auth rate limiting', () => {
  it('limits login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ email: 'a', password: 'b' });
    }
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a', password: 'b' });
    expect(res.status).toBe(429);
  });

  it('limits password reset requests', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' });
    }
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(429);
  });

  it('limits password setup resend requests', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/resend-password-setup')
        .send({ email: `user${i}@example.com` });
    }
    const res = await request(app)
      .post('/auth/resend-password-setup')
      .send({ email: 'user5@example.com' });
    expect(res.status).toBe(429);
  });
});
