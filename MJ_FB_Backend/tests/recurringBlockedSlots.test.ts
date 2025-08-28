import request from 'supertest';
import express from 'express';
import recurringBlockedSlotsRouter from '../src/routes/recurringBlockedSlots';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/recurring-blocked-slots', recurringBlockedSlotsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recurring blocked slots validation', () => {
  it('returns 400 for invalid POST body', async () => {
    const res = await request(app)
      .post('/recurring-blocked-slots')
      .send({ dayOfWeek: 1, slotId: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /recurring-blocked-slots', () => {
  it('returns mapped slots', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 1, day_of_week: 2, week_of_month: 3, slot_id: 4, reason: 'weekly' },
      ],
    });

    const res = await request(app).get('/recurring-blocked-slots');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, dayOfWeek: 2, weekOfMonth: 3, slotId: 4, reason: 'weekly' },
    ]);
  });
});

describe('POST /recurring-blocked-slots', () => {
  it('adds or updates a slot', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});

    const res = await request(app)
      .post('/recurring-blocked-slots')
      .send({ dayOfWeek: 2, weekOfMonth: 3, slotId: 4, reason: 'test' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Added' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      [2, 3, 4, 'test'],
    );
  });
});

