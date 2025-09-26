import request from 'supertest';
import express from 'express';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { notifyOps } from '../src/utils/opsAlert';
import writeXlsxFile from 'write-excel-file/node';
import type { Row } from 'write-excel-file';
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

describe('Monetary donor insights', () => {
  it('returns insights with expected SQL and formatting', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          { month: '2024-01', totalAmount: 0, donationCount: 0, donorCount: 0, averageGift: 0 },
          { month: '2024-02', totalAmount: '500', donationCount: '5', donorCount: '3', averageGift: '100.5' },
          { month: '2024-03', totalAmount: '250', donationCount: '2', donorCount: '2', averageGift: '125.0' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            totalAmount: '750',
            donationCount: '7',
            donorCount: '4',
            averageGift: '107.14',
            averageDonationsPerDonor: '1.75',
            lastDonationISO: '2024-03-22',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            firstName: 'Jamie',
            lastName: 'Donor',
            email: 'j@example.com',
            windowAmount: '400',
            lifetimeAmount: '1200',
            lastDonationISO: '2024-03-20',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { month: '2024-02', tier: '1-100', donorCount: '2', totalAmount: '150' },
          { month: '2024-02', tier: '101-500', donorCount: '1', totalAmount: '200' },
          { month: '2024-03', tier: '1-100', donorCount: '1', totalAmount: '50' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            firstName: 'New',
            lastName: 'Supporter',
            email: null,
            firstDonationISO: '2024-03-05',
            amount: '75',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { families: '120', adults: '200', children: '150', pounds: '5000' },
        ],
      });

    const res = await request(app)
      .get('/monetary-donors/insights?months=3&endMonth=2024-03')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('generate_series'),
      ['2024-01-01', '2024-03-01', '2024-04-01'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('WITH ytd AS'),
      ['2024-01-01', '2024-04-01'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('tiers AS'),
      ['2024-02-01', '2024-03-01', '2024-04-01'],
    );

    expect(res.body.window).toEqual({ startMonth: '2024-01', endMonth: '2024-03', months: 3 });
    expect(res.body.monthly).toEqual([
      { month: '2024-01', totalAmount: 0, donationCount: 0, donorCount: 0, averageGift: 0 },
      { month: '2024-02', totalAmount: 500, donationCount: 5, donorCount: 3, averageGift: 100.5 },
      { month: '2024-03', totalAmount: 250, donationCount: 2, donorCount: 2, averageGift: 125 },
    ]);
    expect(res.body.ytd).toEqual({
      totalAmount: 750,
      donationCount: 7,
      donorCount: 4,
      averageGift: 107.14,
      averageDonationsPerDonor: 1.75,
      lastDonationISO: '2024-03-22',
    });
    expect(res.body.topDonors).toEqual([
      {
        id: 3,
        firstName: 'Jamie',
        lastName: 'Donor',
        email: 'j@example.com',
        windowAmount: 400,
        lifetimeAmount: 1200,
        lastDonationISO: '2024-03-20',
      },
    ]);

    expect(res.body.givingTiers.currentMonth).toMatchObject({
      month: '2024-03',
      tiers: {
        '1-100': { donorCount: 1, totalAmount: 50 },
        '101-500': { donorCount: 0, totalAmount: 0 },
      },
    });
    expect(res.body.givingTiers.previousMonth).toMatchObject({
      month: '2024-02',
      tiers: {
        '1-100': { donorCount: 2, totalAmount: 150 },
        '101-500': { donorCount: 1, totalAmount: 200 },
      },
    });

    expect(res.body.firstTimeDonors).toEqual([
      {
        id: 7,
        firstName: 'New',
        lastName: 'Supporter',
        email: null,
        firstDonationISO: '2024-03-05',
        amount: 75,
      },
    ]);

    expect(res.body.pantryImpact).toEqual({ families: 120, adults: 200, children: 150, pounds: 5000 });
  });

  it('validates query parameters', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [authRow] });

    const invalidMonths = await request(app)
      .get('/monetary-donors/insights?months=0')
      .set('Authorization', 'Bearer token');
    expect(invalidMonths.status).toBe(400);

    const invalidEnd = await request(app)
      .get('/monetary-donors/insights?endMonth=2024/02')
      .set('Authorization', 'Bearer token');
    expect(invalidEnd.status).toBe(400);
  });

  it('handles database errors', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db failed'));

    const res = await request(app)
      .get('/monetary-donors/insights')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(500);
  });

  it('allows staff without donor management access to view insights', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/monetary-donors/insights')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });

  it('blocks non-staff users without donor management access', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 2, role: 'volunteer', type: 'volunteer', access: [] });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 2, first_name: 'Val', last_name: 'Volunteer', email: 'v@example.com' }],
    });

    const res = await request(app)
      .get('/monetary-donors/insights')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

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

  it('rejects invalid donor data', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .post('/monetary-donors')
      .send({ firstName: '', lastName: '', email: 'bad' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid donor update', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .put('/monetary-donors/2')
      .send({ firstName: '', lastName: '', email: 'bad' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('handles db error on list donors', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .get('/monetary-donors')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('handles db error on add donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .post('/monetary-donors')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('handles db error on update donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .put('/monetary-donors/2')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('handles db error on delete donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .delete('/monetary-donors/3')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });
});

describe('Monetary donation CRUD', () => {
  it('lists donations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, date: '2024-01-01', amount: 100 }] });
    const res = await request(app)
      .get('/monetary-donors/2/donations')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'SELECT id, date, amount FROM monetary_donations WHERE donor_id = $1 ORDER BY date DESC, id DESC',
      ['2'],
    );
  });

  it('handles db error on list donations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .get('/monetary-donors/2/donations')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('adds donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, donorId: 2, date: '2024-01-01', amount: 100 }],
      });
    const res = await request(app)
      .post('/monetary-donors/2/donations')
      .send({ date: '2024-01-01', amount: 100 })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO monetary_donations'),
      [2, '2024-01-01', 100],
    );
  });

  it('rejects invalid donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .post('/monetary-donors/2/donations')
      .send({ date: '', amount: 'bad' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('handles db error on add donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .post('/monetary-donors/2/donations')
      .send({ date: '2024-01-01', amount: 100 })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('updates donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, donorId: 2, date: '2024-01-02', amount: 200 }] });
    const res = await request(app)
      .put('/monetary-donors/donations/5')
      .send({ donorId: 2, date: '2024-01-02', amount: 200 })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE monetary_donations'),
      [2, '2024-01-02', 200, '5'],
    );
  });

  it('returns 404 when donation not found', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .put('/monetary-donors/donations/5')
      .send({ donorId: 2, date: '2024-01-02', amount: 200 })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(404);
  });

  it('rejects invalid donation update', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .put('/monetary-donors/donations/5')
      .send({ donorId: 'x', date: '', amount: 'bad' })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('handles db error on update donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .put('/monetary-donors/donations/5')
      .send({ donorId: 2, date: '2024-01-02', amount: 200 })
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('deletes donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({});
    const res = await request(app)
      .delete('/monetary-donors/donations/5')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenNthCalledWith(2, 'DELETE FROM monetary_donations WHERE id = $1', ['5']);
  });

  it('handles db error on delete donation', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['donor_management'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .delete('/monetary-donors/donations/5')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
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

    const excelData: Row[] = [
      [
        { value: 'First Name' },
        { value: 'Last Name' },
        { value: 'Email' },
        { value: 'Payment Date' },
        { value: 'Payment Status' },
        { value: 'Total Amount' },
      ],
      [
        { value: 'Alice' },
        { value: 'A' },
        { value: 'a@example.com' },
        { value: '2024-01-15T06:00:00Z' },
        { value: 'Succeeded' },
        { value: '$10.00' },
      ],
      [
        { value: 'Bob' },
        { value: 'Builder' },
        { value: '' },
        { value: '2024-01-20T06:00:00Z' },
        { value: 'Succeeded' },
        { value: '$20.00' },
      ],
    ];
    const excelBuffer = await writeXlsxFile(excelData, { buffer: true });

    const res = await request(app)
      .post('/monetary-donors/import')
      .attach('file', Buffer.from(excelBuffer), 'donations.xlsx')
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

  it('accepts Payment Date alias headers', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['donor_management'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({});

    const excelData: Row[] = [
      [
        { value: 'First Name' },
        { value: 'Last Name' },
        { value: 'Email' },
        { value: 'Payment Date (America/Regina)' },
        { value: 'Payment Status' },
        { value: 'Total Amount' },
      ],
      [
        { value: 'Casey' },
        { value: 'Contributor' },
        { value: 'casey@example.com' },
        { value: '2024-02-15T06:00:00Z' },
        { value: 'Succeeded' },
        { value: '$15.00' },
      ],
    ];
    const excelBuffer = await writeXlsxFile(excelData, { buffer: true });

    const res = await request(app)
      .post('/monetary-donors/import')
      .attach('file', Buffer.from(excelBuffer), 'donations.xlsx')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id FROM monetary_donors WHERE email = $1',
      ['casey@example.com'],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donors'),
      ['Casey', 'Contributor', 'casey@example.com'],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO monetary_donations'),
      [3, expect.any(String), 1500],
    );
    expect(res.body).toEqual({ donorsAdded: 1, donationsImported: 1 });
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
