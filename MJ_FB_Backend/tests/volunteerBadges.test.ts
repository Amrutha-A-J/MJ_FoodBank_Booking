import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteer/volunteers';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).user = { id: 1 };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteers', volunteersRouter);

describe('Volunteer badge routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('awards a badge', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app).post('/volunteers/me/badges').send({ badgeCode: 'helper' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ badgeCode: 'helper' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO volunteer_badges'),
      [1, 'helper'],
    );
  });

  it('returns 400 when badgeCode missing', async () => {
    const res = await request(app).post('/volunteers/me/badges').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'badgeCode is required' });
  });

  it('removes a badge', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/volunteers/me/badges/helper');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ badgeCode: 'helper' });
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM volunteer_badges WHERE volunteer_id = $1 AND badge_code = $2',
      [1, 'helper'],
    );
  });

  it('returns 404 when badge not found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete('/volunteers/me/badges/helper');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Badge not found' });
  });
});

export {};
