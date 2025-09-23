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

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /warehouse-overall/monthly-history/export', () => {
  it('returns an excel file with monthly donation history grouped by year', async () => {
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
          { year: 2023, month: 1, donations: 10, petFood: 5 },
          { year: 2024, month: 1, donations: 20, petFood: 0 },
          { year: 2024, month: 3, donations: 5, petFood: 5 },
        ],
      });

    const buffer = Buffer.from('monthly-history');
    (writeXlsxFile as jest.Mock).mockResolvedValueOnce(buffer);

    const res = await request(app)
      .get('/warehouse-overall/monthly-history/export')
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
    expect(values[0]).toEqual(['Month', 2023, 2024, 'Total']);
    expect(values[1]).toEqual(['January', 15, 20, 35]);
    expect(values[2]).toEqual(['February', 0, 0, 0]);
    expect(values[3]).toEqual(['March', 0, 10, 10]);
    expect(values[13]).toEqual(['Total', 15, 30, 45]);
  });
});
