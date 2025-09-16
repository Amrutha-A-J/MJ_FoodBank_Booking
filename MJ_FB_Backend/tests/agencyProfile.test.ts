import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';


jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: '1', type: 'agency', role: 'agency' };
    next();
  },
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/middleware/validate', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/users', usersRouter);

afterEach(() => {
  (pool.query as jest.Mock).mockReset();
});

describe('Agency profile routes', () => {
  it('returns agency details', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Agency', email: 'agency@example.com', contact_info: '123-4567' }],
    });

    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 1,
      firstName: 'Agency',
      lastName: '',
      email: 'agency@example.com',
      phone: '123-4567',
      address: null,
      role: 'agency',
    });
  });

  it('updates agency details', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Agency', email: 'new@example.com', contact_info: 'info' }],
    });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ email: 'new@example.com', phone: 'info' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE agencies'),
      ['new@example.com', 'info', '1'],
    );
    expect(res.body).toEqual({
      id: 1,
      firstName: 'Agency',
      lastName: '',
      email: 'new@example.com',
      phone: 'info',
      address: null,
      role: 'agency',
    });
  });
});
