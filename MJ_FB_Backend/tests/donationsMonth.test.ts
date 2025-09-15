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

const authRow = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  email: 't@example.com',
  role: 'staff',
};

describe('GET /donations?month=', () => {
  it('returns donations for the given month', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    const year = new Date().getFullYear();
    const month = '02';
    const nextMonth = '03';
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: `${year}-${month}-01`,
            weight: 10,
            donorId: 2,
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'a@example.com',
          },
          {
            id: 2,
            date: `${year}-${month}-10`,
            weight: 20,
            donorId: 3,
            firstName: 'Bob',
            lastName: 'Brown',
            email: 'b@example.com',
          },
        ],
      });

    const res = await request(app)
      .get(`/donations?month=${year}-${month}`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT d.id, d.date, d.weight, o.id as "donorId",
              o.first_name as "firstName", o.last_name as "lastName", o.email
         FROM donations d JOIN donors o ON d.donor_email = o.email
         WHERE d.date >= $1 AND d.date < $2 ORDER BY d.date, d.id`,
      [`${year}-${month}-01`, `${year}-${nextMonth}-01`],
    );
    expect(res.body).toEqual([
      {
        id: 1,
        date: `${year}-${month}-01`,
        weight: 10,
        donorId: 2,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'a@example.com',
      },
      {
        id: 2,
        date: `${year}-${month}-10`,
        weight: 20,
        donorId: 3,
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'b@example.com',
      },
    ]);
  });
});

