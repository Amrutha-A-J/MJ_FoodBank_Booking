import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('bcrypt');

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const role = req.headers['x-role'] as string;
    req.user = { id: '1', role: role || 'staff' };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/agencies', agenciesRoutes);
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ message: err.message });
  },
);

describe('POST /agencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agency for staff user', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ id: 5, name: 'A', email: 'a@a.com', password: 'hashed', contact_info: null }],
        rowCount: 1,
      });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app)
      .post('/agencies')
      .send({ name: 'A', email: 'a@a.com', password: 'Abcd1234!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 5);
  });

  it('rejects non-staff user', async () => {
    const res = await request(app)
      .post('/agencies')
      .set('x-role', 'agency')
      .send({ name: 'A', email: 'a@a.com', password: 'Abcd1234!' });

    expect(res.status).toBe(403);
  });
});

