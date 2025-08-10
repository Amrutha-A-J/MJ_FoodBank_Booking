import request from 'supertest';
import express from 'express';
import holidaysRouter from '../src/routes/holidays';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/holidays', holidaysRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /holidays', () => {
  it('allows users to fetch holidays', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
      })
      .mockResolvedValueOnce({
        rows: [{ date: new Date('2024-12-25'), reason: 'Christmas' }],
      });

    const res = await request(app)
      .get('/holidays')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ date: '2024-12-25', reason: 'Christmas' }]);
  });
});
