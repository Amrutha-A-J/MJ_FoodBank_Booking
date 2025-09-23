import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 1, type: 'user', role: 'shopper' };
    next();
  },
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/middleware/validate', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
  validateParams: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/users', usersRouter);

afterEach(() => {
  (pool.query as jest.Mock).mockReset();
});

describe('User preference routes', () => {
  it('returns defaults when no preferences set', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get('/api/v1/users/me/preferences');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ emailReminders: true });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM user_preferences'),
      [1, 'user'],
    );
  });

  it('updates preferences', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ email_reminders: false }],
    });
    const res = await request(app)
      .put('/api/v1/users/me/preferences')
      .send({ emailReminders: false });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_preferences'),
      [1, 'user', false],
    );
    expect(res.body).toEqual({ emailReminders: false });
  });
});
