import request from 'supertest';
import express from 'express';
import slotsRouter from '../src/routes/slots';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/slots', slotsRouter);

describe('slot management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a slot', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 5 },
      ],
    });
    const res = await request(app)
      .post('/slots')
      .send({ startTime: '09:00:00', endTime: '09:30:00', maxCapacity: 5 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: '1',
      startTime: '09:00:00',
      endTime: '09:30:00',
      maxCapacity: 5,
    });
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO slots (start_time, end_time, max_capacity) VALUES ($1, $2, $3) RETURNING id, start_time, end_time, max_capacity',
      ['09:00:00', '09:30:00', 5],
    );
  });

  it('updates slot capacity', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 8 },
      ],
    });
    const res = await request(app)
      .put('/slots/1')
      .send({ startTime: '09:00:00', endTime: '09:30:00', maxCapacity: 8 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: '1',
      startTime: '09:00:00',
      endTime: '09:30:00',
      maxCapacity: 8,
    });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE slots SET start_time = $1, end_time = $2, max_capacity = $3 WHERE id = $4 RETURNING id, start_time, end_time, max_capacity',
      ['09:00:00', '09:30:00', 8, 1],
    );
  });
});
