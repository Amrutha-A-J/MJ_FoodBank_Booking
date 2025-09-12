import request from 'supertest';
import express from 'express';

describe('warehouse overall manual', () => {
  it('requires auth', async () => {
    const routes = require('../src/routes/warehouse/warehouseOverall').default;
    const app = express();
    app.use(express.json());
    app.use('/warehouse-overall', routes);
    const res = await request(app).post('/warehouse-overall/manual');
    expect(res.status).toBe(401);
  });

  it('upserts manual aggregate', async () => {
    jest.resetModules();
    jest.doMock('../src/middleware/authMiddleware', () => ({
      authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
      authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
    }));
    const mockDb = require('./utils/mockDb').default;
    const routes = require('../src/routes/warehouse/warehouseOverall').default;
    const app = express();
    app.use(express.json());
    app.use('/warehouse-overall', routes);
    const payload = { year: 2024, month: 5, donations: 100, surplus: 50, pigPound: 25, outgoingDonations: 10 };
    const res = await request(app).post('/warehouse-overall/manual').send(payload);
    expect(res.status).toBe(200);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO warehouse_overall'),
      [payload.year, payload.month, payload.donations, payload.surplus, payload.pigPound, payload.outgoingDonations],
    );
  });
});
