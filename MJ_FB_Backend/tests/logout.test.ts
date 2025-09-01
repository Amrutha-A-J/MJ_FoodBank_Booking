import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';


const app = express();
app.use('/auth', authRouter);

describe('POST /auth/logout', () => {
  it('clears auth cookies', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('token=;'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refreshToken=;'))).toBe(true);
  });
});
