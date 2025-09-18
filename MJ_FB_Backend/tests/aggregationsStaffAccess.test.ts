import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../src/db';
import pantryAggregationsRoutes from '../src/routes/pantry/aggregations';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import donationsRoutes from '../src/routes/warehouse/donations';
import './utils/mockDb';

jest.mock('jsonwebtoken');

jest.mock('../src/controllers/pantryAggregationController', () => ({
  listWeeklyAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  listMonthlyAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  listYearlyAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  listAvailableYears: (_req: express.Request, res: express.Response) => res.json({ years: [] }),
  listAvailableMonths: (_req: express.Request, res: express.Response) => res.json({ months: [] }),
  listAvailableWeeks: (_req: express.Request, res: express.Response) => res.json({ weeks: [] }),
  exportAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  rebuildAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  manualPantryAggregate: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  manualWeeklyPantryAggregate: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
}));

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  listWarehouseOverall: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  rebuildWarehouseOverall: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  exportWarehouseOverall: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  listAvailableYears: (_req: express.Request, res: express.Response) => res.json({ years: [] }),
  manualWarehouseOverall: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
}));

jest.mock('../src/controllers/warehouse/donationController', () => ({
  listDonations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  addDonation: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  updateDonation: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  deleteDonation: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  donorAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  exportDonorAggregations: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
  manualDonorAggregation: (_req: express.Request, res: express.Response) => res.json({ ok: true }),
}));

const app = express();
app.use(express.json());
app.use('/pantry-aggregations', pantryAggregationsRoutes);
app.use('/warehouse-overall', warehouseOverallRoutes);
app.use('/donations', donationsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'test';
});

beforeEach(() => {
  jest.clearAllMocks();
  (pool.query as jest.Mock).mockResolvedValue({
    rowCount: 1,
    rows: [
      {
        id: 1,
        first_name: 'Staff',
        last_name: 'Member',
        email: 'staff@example.com',
        role: 'staff',
      },
    ],
  });
  (jwt.verify as jest.Mock).mockReturnValue({ id: 1, type: 'staff', role: 'staff' });
});

describe('aggregations access for staff', () => {
  it('allows staff without explicit pantry access to view pantry aggregations', async () => {
    const res = await request(app)
      .get('/pantry-aggregations/weekly?year=2024')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows staff without explicit warehouse access to view warehouse overall aggregations', async () => {
    const res = await request(app)
      .get('/warehouse-overall/?year=2024')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows staff without explicit donation access to view donor aggregations', async () => {
    const res = await request(app)
      .get('/donations/aggregations?year=2024')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows staff to submit manual donor aggregations', async () => {
    const res = await request(app)
      .post('/donations/aggregations/manual')
      .set('Authorization', 'Bearer token')
      .send({ year: 2024, month: 1, donorId: 10, total: 5 });
    expect(res.status).toBe(200);
  });

  it('still rejects unauthenticated requests', async () => {
    (jwt.verify as jest.Mock).mockReset();
    const res = await request(app).get('/pantry-aggregations/weekly?year=2024');
    expect(res.status).toBe(401);
  });
});
