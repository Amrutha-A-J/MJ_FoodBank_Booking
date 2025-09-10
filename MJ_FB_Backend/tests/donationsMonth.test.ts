import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use('/donations', donationsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /donations?month=', () => {
  it('returns donations for the given month', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'Test',
            last_name: 'User',
            email: 't@example.com',
            role: 'staff',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-02-01',
            weight: 10,
            donorId: 2,
            donor: 'Alice',
          },
          {
            id: 2,
            date: '2024-02-10',
            weight: 20,
            donorId: 3,
            donor: 'Bob',
          },
        ],
      });

    const res = await request(app)
      .get('/donations?month=2024-02')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT d.id, d.date, d.weight, d.donor_id as "donorId", o.name as donor
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE d.date >= $1 AND d.date < $2 ORDER BY d.date, d.id`,
      ['2024-02-01', '2024-03-01'],
    );
    expect(res.body).toEqual([
      { id: 1, date: '2024-02-01', weight: 10, donorId: 2, donor: 'Alice' },
      { id: 2, date: '2024-02-10', weight: 20, donorId: 3, donor: 'Bob' },
    ]);
  });
});

