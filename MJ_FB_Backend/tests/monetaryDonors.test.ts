import request from 'supertest';
import express from 'express';
import monetaryDonorsRoutes from '../src/routes/monetaryDonors';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('jsonwebtoken');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/monetary-donors', monetaryDonorsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

const authRow = { id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' };

describe('Monetary donor CRUD', () => {
  it('lists donors', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, firstName: 'Alice', lastName: 'A', email: 'a@example.com' },
        ],
      });

    const res = await request(app)
      .get('/monetary-donors?search=Al')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM monetary_donors'),
      ['%Al%'],
    );
    expect(res.body).toEqual([{ id: 1, firstName: 'Alice', lastName: 'A', email: 'a@example.com' }]);
  });

  it('adds donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 2, firstName: 'Bob', lastName: 'B', email: 'b@example.com' }],
      });

    const res = await request(app)
      .post('/monetary-donors')
      .send({ firstName: 'Bob', lastName: 'B', email: 'b@example.com' })
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO monetary_donors'),
      ['Bob', 'B', 'b@example.com'],
    );
  });

  it('updates donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 2, firstName: 'Bob', lastName: 'Builder', email: 'b@example.com' }],
      });

    const res = await request(app)
      .put('/monetary-donors/2')
      .send({ firstName: 'Bob', lastName: 'Builder', email: 'b@example.com' })
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE monetary_donors'),
      ['Bob', 'Builder', 'b@example.com', '2'],
    );
  });

  it('deletes donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .delete('/monetary-donors/3')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenNthCalledWith(2, 'DELETE FROM monetary_donors WHERE id = $1', ['3']);
  });
});

describe('Mailing list generation', () => {
  it('groups donors by amount', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, firstName: 'A', lastName: 'A', email: 'a@example.com', amount: 50 },
          { id: 2, firstName: 'B', lastName: 'B', email: 'b@example.com', amount: 200 },
          { id: 3, firstName: 'C', lastName: 'C', email: 'c@example.com', amount: 600 },
        ],
      });

    const res = await request(app)
      .get('/monetary-donors/mail-lists?year=2024&month=5')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body['1-100']).toHaveLength(1);
    expect(res.body['101-500']).toHaveLength(1);
    expect(res.body['501+']).toHaveLength(1);
  });

  it('uses previous month by default', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-07-05T00:00:00Z'));
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/monetary-donors/mail-lists')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('n.date >= $1 AND n.date < $2'),
      ['2024-06-01', '2024-07-01'],
    );
    jest.useRealTimers();
  });

  it('sends mailing lists with template mapping', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          { first_name: 'A', email: 'a@example.com', amount: 50 },
          { first_name: 'B', email: 'b@example.com', amount: 150 },
          { first_name: 'C', email: 'c@example.com', amount: 600 },
        ],
        rowCount: 3,
      })
      .mockResolvedValueOnce({
        rows: [{ families: 4, children: 7, pounds: 120 }],
      });

    const res = await request(app)
      .post('/monetary-donors/mail-lists/send')
      .send({ year: 2024, month: 6 })
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('n.date >= $1 AND n.date < $2'),
      ['2024-06-01', '2024-07-01'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM pantry_monthly_overall'),
      [2024, 6],
    );
    expect(pool.query.mock.calls[2][0]).toEqual(
      expect.stringContaining('weight AS pounds'),
    );
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(3);
    expect((sendTemplatedEmail as jest.Mock).mock.calls[0][0]).toEqual({
      to: 'a@example.com',
      templateId: 11,
      params: { firstName: 'A', amount: 50, families: 4, children: 7, pounds: 120 },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[1][0]).toEqual({
      to: 'b@example.com',
      templateId: 12,
      params: { firstName: 'B', amount: 150, families: 4, children: 7, pounds: 120 },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[2][0]).toEqual({
      to: 'c@example.com',
      templateId: 12,
      params: { firstName: 'C', amount: 600, families: 4, children: 7, pounds: 120 },
    });
    expect(res.body).toEqual({ sent: 3 });
  });
});
