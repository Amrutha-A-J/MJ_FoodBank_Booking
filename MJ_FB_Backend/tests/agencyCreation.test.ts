import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import pool from '../src/db';
import bcrypt from 'bcrypt';

let role = 'staff';
jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role };
    next();
  },
  authorizeRoles: (...allowed: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/agencies', agenciesRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /agencies', () => {
  it('creates agency when staff', async () => {
    role = 'staff';
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        { id: 1, name: 'A', email: 'a@b.com', password: 'hashed', contact_info: null },
      ],
    });
    const res = await request(app)
      .post('/agencies')
      .send({ name: 'A', email: 'a@b.com', password: 'Password1!' });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalled();
  });

  it('rejects non-staff', async () => {
    role = 'agency';
    const res = await request(app)
      .post('/agencies')
      .send({ name: 'A', email: 'a@b.com', password: 'Password1!' });
    expect(res.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
