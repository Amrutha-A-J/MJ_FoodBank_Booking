import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { role: 'staff' };
  next();
});
app.use('/users', usersRouter);

describe('DELETE /users/id/:clientId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes existing user', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
    const res = await request(app).delete('/users/id/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'User deleted' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM clients WHERE client_id = $1', [5]);
  });

  it('returns 404 when user missing', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
    const res = await request(app).delete('/users/id/99');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
  });

  it('returns 409 when user has related records', async () => {
    (pool.query as jest.Mock).mockRejectedValue({ code: '23503' });
    const res = await request(app).delete('/users/id/5');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Cannot delete user with existing records' });
  });
});
