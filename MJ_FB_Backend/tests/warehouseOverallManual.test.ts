import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import './utils/mockDb';

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

beforeEach(() => {
  (pool.query as jest.Mock).mockClear();
});

describe('POST /warehouse-overall/manual', () => {
  it('saves manual warehouse totals when staff submit data', async () => {
    const res = await request(app)
      .post('/warehouse-overall/manual')
      .send({ year: 2024, month: 5, donations: 100 });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO warehouse_overall'),
      expect.arrayContaining([2024, 5]),
    );
  });
});
