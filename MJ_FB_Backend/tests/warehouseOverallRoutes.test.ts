import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import './utils/mockDb';

jest.mock('jsonwebtoken');

const listWarehouseOverall = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json([{ month: 1, donations: 100 }]),
);
const listAvailableYears = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json([2024, 2023]),
);
const rebuildWarehouseOverall = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ message: 'Rebuilt' }),
);
const manualWarehouseOverall = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ message: 'Saved' }),
);
const exportWarehouseOverall = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).send('export'),
);
const listMonthlyDonationHistory = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ years: [], entries: [] }),
);
const exportMonthlyDonationHistory = jest.fn((_req: express.Request, res: express.Response) =>
  res.status(200).send('ok'),
);

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  listWarehouseOverall: (...args: Parameters<typeof listWarehouseOverall>) =>
    listWarehouseOverall(...args),
  listAvailableYears: (...args: Parameters<typeof listAvailableYears>) =>
    listAvailableYears(...args),
  rebuildWarehouseOverall: (...args: Parameters<typeof rebuildWarehouseOverall>) =>
    rebuildWarehouseOverall(...args),
  manualWarehouseOverall: (...args: Parameters<typeof manualWarehouseOverall>) =>
    manualWarehouseOverall(...args),
  exportWarehouseOverall: (...args: Parameters<typeof exportWarehouseOverall>) =>
    exportWarehouseOverall(...args),
  listMonthlyDonationHistory: (
    ...args: Parameters<typeof listMonthlyDonationHistory>
  ) => listMonthlyDonationHistory(...args),
  exportMonthlyDonationHistory: (
    ...args: Parameters<typeof exportMonthlyDonationHistory>
  ) => exportMonthlyDonationHistory(...args),
}));

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
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

describe('warehouse overall routes', () => {
  it('requires authentication for available years', async () => {
    const res = await request(app).get('/warehouse-overall/years');

    expect(res.status).toBe(401);
    expect(listAvailableYears).not.toHaveBeenCalled();
  });

  it('returns available years for authorized staff', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      type: 'staff',
      role: 'staff',
      access: ['warehouse'],
    });

    const res = await request(app)
      .get('/warehouse-overall/years')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([2024, 2023]);
  });

  it('returns warehouse totals for authorized staff', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      type: 'staff',
      role: 'staff',
      access: ['warehouse'],
    });

    const res = await request(app)
      .get('/warehouse-overall')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(listWarehouseOverall).toHaveBeenCalled();
  });

  it('rebuilds warehouse data for authorized staff', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      type: 'staff',
      role: 'staff',
      access: ['warehouse'],
    });

    const res = await request(app)
      .post('/warehouse-overall/rebuild?year=2024')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(rebuildWarehouseOverall).toHaveBeenCalled();
  });

  it('allows manual overrides for authorized staff', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      type: 'staff',
      role: 'staff',
      access: ['warehouse'],
    });

    const res = await request(app)
      .post('/warehouse-overall/manual')
      .set('Authorization', 'Bearer token')
      .send({ year: 2024, month: 1 });

    expect(res.status).toBe(200);
    expect(manualWarehouseOverall).toHaveBeenCalled();
  });

  it('exports warehouse data for authorized staff', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      type: 'staff',
      role: 'staff',
      access: ['warehouse'],
    });

    const res = await request(app)
      .get('/warehouse-overall/export?year=2024')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(exportWarehouseOverall).toHaveBeenCalled();
  });
});
