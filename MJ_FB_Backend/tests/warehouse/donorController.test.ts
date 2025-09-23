import request from 'supertest';
import express from 'express';

import '../utils/mockDb';
import pool from '../../src/db';
import donorsRoutes from '../../src/routes/donors';

jest.mock('../../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'staff', type: 'staff', access: ['warehouse'] };
    next();
  },
  authorizeAccess: () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}));

jest.mock('../../src/middleware/validate', () => ({
  validate: () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}));

const app = express();
app.use(express.json());
app.use('/donors', donorsRoutes);

describe('updateDonor warehouse refresh', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockReset();
  });

  it('moves monthly totals from donations to pet food when donor switches to pet food', async () => {
    let warehouseInsertParams: any[] | null = null;

    (pool.query as jest.Mock).mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT is_pet_food AS "isPetFood" FROM donors WHERE id = $1')) {
        return Promise.resolve({ rowCount: 1, rows: [{ isPetFood: false }] });
      }
      if (sql.startsWith('UPDATE donors SET')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: 1,
              name: 'Donor',
              email: 'donor@example.com',
              phone: null,
              isPetFood: true,
            },
          ],
        });
      }
      if (sql.includes("DATE_TRUNC('month', date)")) {
        return Promise.resolve({ rows: [{ monthStart: '2024-01-01T00:00:00.000Z' }] });
      }
      if (sql.includes('FROM donations d') && sql.includes('LEFT JOIN donors o')) {
        return Promise.resolve({ rows: [{ donations: 0, petFood: 25 }] });
      }
      if (sql.includes('FROM surplus_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM pig_pound_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM outgoing_donation_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM donations d') && sql.includes('GROUP BY o.id')) {
        return Promise.resolve({ rows: [{ donorId: 1, total: 25 }] });
      }
      if (sql.startsWith('INSERT INTO warehouse_overall')) {
        warehouseInsertParams = params ?? [];
        return Promise.resolve({});
      }
      if (sql.startsWith('DELETE FROM donor_aggregations')) {
        return Promise.resolve({});
      }
      if (sql.startsWith('INSERT INTO donor_aggregations')) {
        return Promise.resolve({});
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .put('/donors/1')
      .send({ name: 'Updated Donor', email: 'donor@example.com', phone: null, isPetFood: true });

    expect(res.status).toBe(200);
    expect(warehouseInsertParams).toEqual([2024, 1, 0, 0, 0, 0, 25]);
  });

  it('moves monthly totals from pet food back to donations when donor switches off pet food', async () => {
    let warehouseInsertParams: any[] | null = null;

    (pool.query as jest.Mock).mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT is_pet_food AS "isPetFood" FROM donors WHERE id = $1')) {
        return Promise.resolve({ rowCount: 1, rows: [{ isPetFood: true }] });
      }
      if (sql.startsWith('UPDATE donors SET')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: 1,
              name: 'Donor',
              email: 'donor@example.com',
              phone: null,
              isPetFood: false,
            },
          ],
        });
      }
      if (sql.includes("DATE_TRUNC('month', date)")) {
        return Promise.resolve({ rows: [{ monthStart: '2024-01-01T00:00:00.000Z' }] });
      }
      if (sql.includes('FROM donations d') && sql.includes('LEFT JOIN donors o')) {
        return Promise.resolve({ rows: [{ donations: 25, petFood: 0 }] });
      }
      if (sql.includes('FROM surplus_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM pig_pound_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM outgoing_donation_log')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      if (sql.includes('FROM donations d') && sql.includes('GROUP BY o.id')) {
        return Promise.resolve({ rows: [{ donorId: 1, total: 25 }] });
      }
      if (sql.startsWith('INSERT INTO warehouse_overall')) {
        warehouseInsertParams = params ?? [];
        return Promise.resolve({});
      }
      if (sql.startsWith('DELETE FROM donor_aggregations')) {
        return Promise.resolve({});
      }
      if (sql.startsWith('INSERT INTO donor_aggregations')) {
        return Promise.resolve({});
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .put('/donors/1')
      .send({ name: 'Updated Donor', email: 'donor@example.com', phone: null, isPetFood: false });

    expect(res.status).toBe(200);
    expect(warehouseInsertParams).toEqual([2024, 1, 25, 0, 0, 0, 0]);
  });
});
