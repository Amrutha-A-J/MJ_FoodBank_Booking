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
