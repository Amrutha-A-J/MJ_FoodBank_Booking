import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import pantryAggregationsRoutes from '../src/routes/pantry/aggregations';
import pool from '../src/db';
import './utils/mockDb';

jest.mock('jsonwebtoken');

jest.mock('../src/controllers/pantryAggregationController', () => ({
  listWeeklyAggregations: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  listMonthlyAggregations: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  listYearlyAggregations: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  listAvailableYears: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  listAvailableMonths: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  listAvailableWeeks: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  exportAggregations: (_req: express.Request, res: express.Response) => res.status(200).send('ok'),
  rebuildAggregations: (_req: express.Request, res: express.Response) => res.status(200).json({}),
  manualPantryAggregate: (_req: express.Request, res: express.Response) => res.status(200).json({}),
  manualWeeklyPantryAggregate: (_req: express.Request, res: express.Response) => res.status(200).json({}),
}));

const app = express();
app.use(express.json());
app.use('/pantry-aggregations', pantryAggregationsRoutes);

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

describe('pantry aggregations auth', () => {
  it('requires auth for weekly aggregations', async () => {
    const res = await request(app).get('/pantry-aggregations/weekly');
    expect(res.status).toBe(401);
  });

  it('requires auth for available months', async () => {
    const res = await request(app).get('/pantry-aggregations/months');
    expect(res.status).toBe(401);
  });

  it('requires auth for available weeks', async () => {
    const res = await request(app).get('/pantry-aggregations/weeks');
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/pantry-aggregations/export');
    expect(res.status).toBe(401);
  });

  it('requires auth for manual aggregate', async () => {
    const res = await request(app).post('/pantry-aggregations/manual');
    expect(res.status).toBe(401);
  });
  it('requires auth for manual weekly aggregate', async () => {
    const res = await request(app).post('/pantry-aggregations/manual/weekly');
    expect(res.status).toBe(401);
  });

  it('allows staff without aggregations access to view weekly data', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });

    const res = await request(app)
      .get('/pantry-aggregations/weekly')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });
});
