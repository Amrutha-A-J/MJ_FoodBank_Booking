import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'staff', type: 'staff', access: ['warehouse'] };
    next();
  },
  authorizeRoles: () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  authorizeAccess: () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  optionalAuthMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/warehouse-overall', warehouseOverallRoutes);
const year = new Date().getFullYear();

beforeEach(() => {
  (pool.query as jest.Mock).mockReset();
});

describe('POST /warehouse-overall/manual', () => {
  it('inserts manual aggregate', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});

    const body = {
      year,
      month: 5,
      donations: 10,
      petFood: 4,
      surplus: 2,
      pigPound: 1,
      outgoingDonations: 3,
    };

    const res = await request(app).post('/warehouse-overall/manual').send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Saved' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO warehouse_overall'),
      [year, 5, 10, 2, 1, 3, 4],
    );
  });

  it('updates manual aggregate', async () => {
    (pool.query as jest.Mock).mockResolvedValue({});

    await request(app)
      .post('/warehouse-overall/manual')
      .send({ year, month: 5, donations: 1, petFood: 2, surplus: 2, pigPound: 3, outgoingDonations: 4 });

    const res = await request(app)
      .post('/warehouse-overall/manual')
      .send({ year, month: 5, donations: 5, petFood: 6, surplus: 6, pigPound: 7, outgoingDonations: 8 });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.any(String),
      [year, 5, 5, 6, 7, 8, 6],
    );
  });
});
