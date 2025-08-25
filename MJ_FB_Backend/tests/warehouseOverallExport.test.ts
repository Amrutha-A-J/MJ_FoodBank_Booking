import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';

jest.mock(
  'xlsx',
  () => ({
    __esModule: true,
    default: {
      utils: {
        book_new: jest.fn(() => ({})),
        json_to_sheet: jest.fn(() => ({})),
        book_append_sheet: jest.fn(),
      },
      write: jest.fn(() => Buffer.from('test')),
    },
  }),
  { virtual: true },
);

jest.mock('../src/db');

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

describe('GET /warehouse-overall/export', () => {
  it('returns an excel file for the specified year', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { month: 1, donations: 10, surplus: 2, pigPound: 1, outgoingDonations: 0 },
        { month: 2, donations: 5, surplus: 3, pigPound: 0, outgoingDonations: 1 },
      ],
    });

    const res = await request(app)
      .get('/warehouse-overall/export?year=2024')
      .buffer()
      .parse((res, cb) => {
        const data: Buffer[] = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    expect(res.body.equals(Buffer.from('test'))).toBe(true);
  });
});
