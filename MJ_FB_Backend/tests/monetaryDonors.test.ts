import request from 'supertest';
import express from 'express';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { notifyOps } from '../src/utils/opsAlert';

jest.mock(
  'csv-parse/sync',
  () => ({
    parse: jest.fn((str: string) => {
      const [headerLine, ...lines] = str.trim().split('\n');
      const headers = headerLine.split(',');
      return lines.map(line => {
        const values = line.split(',');
        return headers.reduce<Record<string, string>>((acc, h, i) => {
          acc[h] = values[i] ?? '';
          return acc;
        }, {});
      });
    }),
  }),
  { virtual: true },
);
import monetaryDonorsRoutes from '../src/routes/monetaryDonors';

jest.mock('jsonwebtoken');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));
jest.mock('../src/utils/opsAlert', () => ({
  notifyOps: jest.fn(),
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
          { id: 1, firstName: 'Alice', lastName: 'A', email: null },
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
    expect(res.body).toEqual([{ id: 1, firstName: 'Alice', lastName: 'A', email: null }]);
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

describe('Import Zeffy donations', () => {
  it('imports donors with and without emails', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['donor_management'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      // existing donor by email
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
      // donation insert for existing donor
      .mockResolvedValueOnce({})
      // check for donor without email
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      // insert new donor without email
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      // donation insert for new donor
      .mockResolvedValueOnce({});

    const csv = [
      'First Name,Last Name,Email,Payment Date,Payment Status,Total Amount',
      'Alice,A,a@example.com,2024-01-15T06:00:00Z,Succeeded,$10.00',
      'Bob,Builder,,2024-01-20T06:00:00Z,Succeeded,$20.00',
    ].join('\n');

    const res = await request(app)
      .post('/monetary-donors/import')
      .attach('file', Buffer.from(csv), 'donations.csv')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id FROM monetary_donors WHERE email = $1',
      ['a@example.com'],
    );
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id FROM monetary_donors WHERE first_name = $1 AND last_name = $2 AND email IS NULL',
      ['Bob', 'Builder'],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donors'),
      ['Bob', 'Builder', null],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donations'),
      [1, expect.any(String), 1000],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donations'),
      [2, expect.any(String), 2000],
    );
    expect(res.body).toEqual({ donorsAdded: 1, donationsImported: 2 });
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
          { id: 3, firstName: 'C', lastName: 'C', email: 'c@example.com', amount: 700 },
          { id: 4, firstName: 'D', lastName: 'D', email: 'd@example.com', amount: 5000 },
          { id: 5, firstName: 'E', lastName: 'E', email: 'e@example.com', amount: 20000 },
        ],
      });

    const res = await request(app)
      .get('/monetary-donors/mail-lists?year=2024&month=5')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body['1-100']).toHaveLength(1);
    expect(res.body['101-500']).toHaveLength(1);
    expect(res.body['501-1000']).toHaveLength(1);
    expect(res.body['1001-10000']).toHaveLength(1);
    expect(res.body['10001-30000']).toHaveLength(1);
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
          { id: 1, first_name: 'A', email: 'a@example.com', amount: 50 },
          { id: 2, first_name: 'B', email: 'b@example.com', amount: 150 },
          { id: 3, first_name: 'C', email: 'c@example.com', amount: 700 },
          { id: 4, first_name: 'D', email: 'd@example.com', amount: 5000 },
          { id: 5, first_name: 'E', email: 'e@example.com', amount: 20000 },
        ],
        rowCount: 5,
      })
      .mockResolvedValueOnce({
        rows: [{ families: 4, adults: 10, children: 7, pounds: 120 }],
      })
      .mockResolvedValue({});

    const res = await request(app)
      .post('/monetary-donors/mail-lists/send')
      .send({ year: 2024, month: 6 })
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LEFT JOIN monetary_donor_mail_log'),
      ['2024-06-01', '2024-07-01', 2024, 6],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM pantry_monthly_overall'),
      [2024, 6],
    );
    expect(pool.query.mock.calls[2][0]).toEqual(
      expect.stringContaining('weight AS pounds'),
    );
    expect(pool.query.mock.calls[2][0]).toEqual(
      expect.stringContaining('orders AS families'),
    );
    expect(pool.query.mock.calls[2][0]).toEqual(
      expect.stringContaining('adults'),
    );
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(5);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donor_mail_log'),
      [1, 2024, 6],
    );
    expect((sendTemplatedEmail as jest.Mock).mock.calls[0][0]).toEqual({
      to: 'a@example.com',
      templateId: 11,
      params: {
        firstName: 'A',
        amount: 50,
        families: 4,
        adults: 10,
        children: 7,
        pounds: 120,
        month: 'June',
        year: 2024,
      },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[1][0]).toEqual({
      to: 'b@example.com',
      templateId: 12,
      params: {
        firstName: 'B',
        amount: 150,
        families: 4,
        adults: 10,
        children: 7,
        pounds: 120,
        month: 'June',
        year: 2024,
      },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[2][0]).toEqual({
      to: 'c@example.com',
      templateId: 13,
      params: {
        firstName: 'C',
        amount: 700,
        families: 4,
        adults: 10,
        children: 7,
        pounds: 120,
        month: 'June',
        year: 2024,
      },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[3][0]).toEqual({
      to: 'd@example.com',
      templateId: 14,
      params: {
        firstName: 'D',
        amount: 5000,
        families: 4,
        adults: 10,
        children: 7,
        pounds: 120,
        month: 'June',
        year: 2024,
      },
    });
    expect((sendTemplatedEmail as jest.Mock).mock.calls[4][0]).toEqual({
      to: 'e@example.com',
      templateId: 15,
      params: {
        firstName: 'E',
        amount: 20000,
        families: 4,
        adults: 10,
        children: 7,
        pounds: 120,
        month: 'June',
        year: 2024,
      },
    });
    expect((notifyOps as jest.Mock).mock.calls).toEqual([
      ['Monetary donor emails sent for 1-100: a@example.com'],
      ['Monetary donor emails sent for 101-500: b@example.com'],
      ['Monetary donor emails sent for 501-1000: c@example.com'],
      ['Monetary donor emails sent for 1001-10000: d@example.com'],
      ['Monetary donor emails sent for 10001-30000: e@example.com'],
    ]);
    expect(res.body).toEqual({ sent: 5 });
  });

  it('does not resend emails already logged for the month', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, first_name: 'A', email: 'a@example.com', amount: 50 }],
      })
      .mockResolvedValueOnce({ rows: [{ families: 4, adults: 10, children: 7, pounds: 120 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ families: 4, adults: 10, children: 7, pounds: 120 }] });

    await request(app)
      .post('/monetary-donors/mail-lists/send')
      .send({ year: 2024, month: 6 })
      .set('Authorization', 'Bearer token');

    const second = await request(app)
      .post('/monetary-donors/mail-lists/send')
      .send({ year: 2024, month: 6 })
      .set('Authorization', 'Bearer token');

    expect(second.body).toEqual({ sent: 0 });
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
  });
});

describe('Donor test emails', () => {
  it('manages test emails', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@test.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [{ id: 2, email: 'b@test.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [{ id: 2, email: 'c@test.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({});

    let res = await request(app)
      .get('/monetary-donors/test-emails')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(2, 'SELECT id, email FROM donor_test_emails ORDER BY id');

    res = await request(app)
      .post('/monetary-donors/test-emails')
      .send({ email: 'b@test.com' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      4,
      'INSERT INTO donor_test_emails (email) VALUES ($1) RETURNING id, email',
      ['b@test.com'],
    );

    res = await request(app)
      .put('/monetary-donors/test-emails/2')
      .send({ email: 'c@test.com' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      6,
      'UPDATE donor_test_emails SET email = $1 WHERE id = $2 RETURNING id, email',
      ['c@test.com', '2'],
    );

    res = await request(app)
      .delete('/monetary-donors/test-emails/2')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenNthCalledWith(
      8,
      'DELETE FROM donor_test_emails WHERE id = $1',
      ['2'],
    );
  });

  it('sends test emails for each tier', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    const origRandom = Math.random;
    Math.random = () => 0.5;
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [{ families: 1, adults: 2, children: 3, pounds: 4 }] })
      .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] });

    const res = await request(app)
      .post('/monetary-donors/mail-lists/test')
      .send({ year: 2024, month: 6 })
      .set('Authorization', 'Bearer token');

    Math.random = origRandom;

    expect(res.status).toBe(200);
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(5);
    expect((sendTemplatedEmail as jest.Mock).mock.calls[0][0]).toEqual({
      to: 'test@example.com',
      templateId: 11,
      params: {
        firstName: 'Test',
        amount: 51,
        families: 1,
        adults: 2,
        children: 3,
        pounds: 4,
        month: 'June',
        year: 2024,
      },
    });
    expect(res.body).toEqual({ sent: 5 });
  });
});
