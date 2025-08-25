import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouseOverall';
import pool from '../src/db';
import readXlsxFile from 'read-excel-file/node';

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

    const rows = await readXlsxFile(res.body);
    expect(rows[0]).toEqual([
      'Month',
      'Donations',
      'Surplus',
      'Pig Pound',
      'Outgoing Donations',
    ]);
    expect(rows[1]).toEqual([1, 10, 2, 1, 0]);
    expect(rows[2]).toEqual([2, 5, 3, 0, 1]);
  });
});
