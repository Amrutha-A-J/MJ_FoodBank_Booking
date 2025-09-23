import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import './utils/mockDb';

jest.mock('jsonwebtoken');

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  listWarehouseOverall: (_req: express.Request, res: express.Response) =>
    res.status(200).json([]),
  listAvailableYears: (_req: express.Request, res: express.Response) =>
    res.status(200).json([2024]),
  rebuildWarehouseOverall: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ message: 'Rebuilt' }),
  manualWarehouseOverall: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ message: 'Saved' }),
  exportWarehouseOverall: (_req: express.Request, res: express.Response) => res.status(200).send('export'),
  listMonthlyDonationHistory: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ years: [], entries: [] }),
  exportMonthlyDonationHistory: (_req: express.Request, res: express.Response) => res.status(200).send('ok'),
}));

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  (jwt.verify as jest.Mock).mockReset();
  (pool.query as jest.Mock).mockReset();
  (pool.query as jest.Mock).mockResolvedValue({
    rowCount: 1,
    rows: [
      {
        id: 1,
        first_name: 'Test',
        last_name: 'Staff',
        email: 'staff@example.com',
        role: 'staff',
      },
    ],
  });
});

describe('warehouse overall auth', () => {
  it('requires auth for monthly history', async () => {
    const res = await request(app).get('/warehouse-overall/monthly-history');
    expect(res.status).toBe(401);
  });

  it('requires auth for monthly export', async () => {
    const res = await request(app).get('/warehouse-overall/monthly-history/export');
    expect(res.status).toBe(401);
  });

  it('allows staff without warehouse access to read monthly history', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });

    const res = await request(app)
      .get('/warehouse-overall/monthly-history')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });
});
