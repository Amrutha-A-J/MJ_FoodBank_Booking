import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import { sendEmail } from '../src/utils/emailUtils';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('bcrypt');

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('POST /api/users/register/otp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends an OTP when client exists and not registered', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, online_access: false }] })
      .mockResolvedValueOnce({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app)
      .post('/api/users/register/otp')
      .send({ clientId: 123, email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'OTP sent' });
    expect(sendEmail).toHaveBeenCalled();
  });
});
