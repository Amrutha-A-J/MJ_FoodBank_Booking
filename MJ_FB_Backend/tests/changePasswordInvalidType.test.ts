import request from 'supertest';
import express from 'express';
import { changePassword } from '../src/controllers/authController';
import pool from '../src/db';

jest.mock('../src/db');

const app = express();
app.use(express.json());
app.post('/auth/change-password', (req, res, next) => {
  (req as any).user = { id: 1, type: 'hacker' };
  return changePassword(req, res, next);
});

describe('POST /auth/change-password', () => {
  it('rejects invalid user type', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'OldPass!1', newPassword: 'NewPass!1' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
