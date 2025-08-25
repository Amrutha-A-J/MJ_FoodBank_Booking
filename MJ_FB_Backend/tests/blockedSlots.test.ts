import request from 'supertest';
import express from 'express';
import blockedSlotsRouter from '../src/routes/blockedSlots';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/blocked-slots', blockedSlotsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('blocked slots validation', () => {
  it('returns 400 for invalid POST body', async () => {
    const res = await request(app).post('/blocked-slots').send({ date: '', slotId: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid DELETE params', async () => {
    const res = await request(app).delete('/blocked-slots/not-a-date/abc');
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /blocked-slots', () => {
  it('includes recurring blocked slots', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ slot_id: 1, reason: 'special' }] })
      .mockResolvedValueOnce({ rows: [{ slot_id: 2, reason: 'weekly' }] });

    const res = await request(app).get('/blocked-slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { slotId: 1, reason: 'special' },
      { slotId: 2, reason: 'weekly' },
    ]);
  });
});
