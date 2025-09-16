import request from 'supertest';
import express from 'express';
import holidaysRouter from '../src/routes/holidays';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { setHolidays } from '../src/utils/holidayCache';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/holidays', holidaysRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
  setHolidays([{ date: '2024-12-24', reason: 'Christmas' }]);
});

describe('GET /holidays', () => {
  it('allows users to fetch holidays', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          client_id: 1,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'shopper',
          phone: '123',
        },
      ],
    });

    const res = await request(app)
      .get('/holidays')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ date: '2024-12-24', reason: 'Christmas' }]);
  });

  it('allows staff to fetch holidays', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'coordinator',
      type: 'staff',
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 1,
          first_name: 'Test',
          last_name: 'Staff',
          email: 'staff@example.com',
          role: 'coordinator',
        },
      ],
    });

    const res = await request(app)
      .get('/holidays')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ date: '2024-12-24', reason: 'Christmas' }]);
  });

});
