import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import './utils/mockDb';

jest.mock('jsonwebtoken');

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  listWarehouseOverall: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  rebuildWarehouseOverall: (_req: express.Request, res: express.Response) => res.status(200).json({}),
  exportWarehouseOverall: (_req: express.Request, res: express.Response) => res.status(200).send('ok'),
  listAvailableYears: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  manualWarehouseOverall: (_req: express.Request, res: express.Response) => res.status(200).json({}),
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
  it('requires auth for list', async () => {
    const res = await request(app).get('/warehouse-overall');
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/warehouse-overall/export?year=2024');
    expect(res.status).toBe(401);
  });

  it('requires auth for years', async () => {
    const res = await request(app).get('/warehouse-overall/years');
    expect(res.status).toBe(401);
  });

  it('allows staff without warehouse access to read overall stats', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });

    const res = await request(app)
      .get('/warehouse-overall')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });
});
