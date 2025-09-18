import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/donations', donationsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /donations/aggregations/manual', () => {
  it('inserts manual donor aggregate', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({});

    const year = new Date().getFullYear();
    const body = { year, month: 5, donorId: 7, total: 100 };
    const res = await request(app)
      .post('/donations/aggregations/manual')
      .set('Authorization', 'Bearer token')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Saved' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO donor_aggregations'),
      [year, 5, 7, 100],
    );
  });
});
