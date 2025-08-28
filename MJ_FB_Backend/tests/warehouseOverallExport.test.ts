import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import writeXlsxFile from 'write-excel-file/node';

jest.mock('../src/db');
jest.mock('write-excel-file/node', () => jest.fn().mockResolvedValue(Buffer.from('test')));

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

    const buffer = Buffer.from('test');
    (writeXlsxFile as jest.Mock).mockResolvedValueOnce(buffer);

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
    expect(res.body).toEqual(buffer);

    const rows = (writeXlsxFile as jest.Mock).mock.calls[0][0];
    const values = rows.map((row: any[]) => row.map(cell => cell.value));
    expect(values[0]).toEqual([
      'Month',
      'Donations',
      'Surplus',
      'Pig Pound',
      'Outgoing Donations',
      'Total',
    ]);
    expect(values[1]).toEqual(['January', 10, 2, 1, 0, 13]);
    expect(values[2]).toEqual(['February', 5, 3, 0, 1, 9]);
    expect(values[3]).toEqual(['March', 0, 0, 0, 0, 0]);
    expect(values[13]).toEqual(['Total', 15, 5, 1, 1, 22]);
  });
});
