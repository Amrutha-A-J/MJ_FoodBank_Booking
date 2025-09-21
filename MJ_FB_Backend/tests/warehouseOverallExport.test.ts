import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import writeXlsxFile from 'write-excel-file/node';
import jwt from 'jsonwebtoken';

jest.mock('write-excel-file/node', () => jest.fn().mockResolvedValue(Buffer.from('test')));
jest.mock('jsonwebtoken');

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);
const year = new Date().getFullYear();

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /warehouse-overall/export', () => {
  it('returns an excel file for the specified year', async () => {
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
      .mockResolvedValueOnce({
        rows: [
          { month: 1, donations: 10, petFood: 2, surplus: 2, pigPound: 1, outgoingDonations: 0 },
          { month: 2, donations: 5, petFood: 1, surplus: 3, pigPound: 0, outgoingDonations: 1 },
        ],
      });

    const buffer = Buffer.from('test');
    (writeXlsxFile as jest.Mock).mockResolvedValueOnce(buffer);

    const res = await request(app)
      .get(`/warehouse-overall/export?year=${year}`)
      .set('Authorization', 'Bearer token')
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
      'Pet Food Donations',
      'Surplus',
      'Pig Pound',
      'Outgoing Donations',
    ]);
    expect(values[1]).toEqual(['January', 10, 2, 2, 1, 0]);
    expect(values[2]).toEqual(['February', 5, 1, 3, 0, 1]);
    expect(values[3]).toEqual(['March', 0, 0, 0, 0, 0]);
    expect(values[13]).toEqual(['Total', 15, 3, 5, 1, 1]);
  });
});
