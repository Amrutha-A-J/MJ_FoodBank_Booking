import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import donationsRoutes from '../src/routes/warehouse/donations';
import pool from '../src/db';
import './utils/mockDb';

jest.mock('jsonwebtoken');

jest.mock('../src/controllers/warehouse/donationController', () => ({
  listDonations: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  addDonation: (_req: express.Request, res: express.Response) => res.status(201).json({ id: 1 }),
  updateDonation: (_req: express.Request, res: express.Response) => res.status(200).json({}),
  deleteDonation: (_req: express.Request, res: express.Response) => res.status(200).json({}),
  donorAggregations: (_req: express.Request, res: express.Response) => res.status(200).json([]),
  exportDonorAggregations: (_req: express.Request, res: express.Response) => res.status(200).send('ok'),
  manualDonorAggregation: (_req: express.Request, res: express.Response) => res.status(200).json({}),
}));

const app = express();
app.use(express.json());
app.use('/donations', donationsRoutes);

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
const year = new Date().getFullYear();

describe('donation aggregations auth', () => {
  it('requires auth for aggregations', async () => {
    const res = await request(app).get(`/donations/aggregations?year=${year}`);
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get(`/donations/aggregations/export?year=${year}`);
    expect(res.status).toBe(401);
  });

  it('requires auth for manual insert', async () => {
    const res = await request(app).post('/donations/aggregations/manual');
    expect(res.status).toBe(401);
  });

  it('allows staff without warehouse access to view donation aggregations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });

    const res = await request(app)
      .get(`/donations/aggregations?year=${year}`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });

  it('allows staff without warehouse access to insert manual aggregations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: [] });

    const res = await request(app)
      .post('/donations/aggregations/manual')
      .set('Authorization', 'Bearer token')
      .send({ year, month: 1, donorId: 1, total: 0 });

    expect(res.status).toBe(200);
  });
});
