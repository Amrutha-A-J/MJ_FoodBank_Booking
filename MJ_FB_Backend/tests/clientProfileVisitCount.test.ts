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

describe('client profile visit count', () => {
  it('refreshes visit count when outdated', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          client_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: null,
          phone: null,
          address: '123 Main St',
          role: 'shopper',
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ bookings_this_month: 2, current: false }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ bookings_this_month: 0 }],
      });

    const res = await request(app).get('/api/v1/users/me');

    expect(res.status).toBe(200);
    expect(res.body.bookingsThisMonth).toBe(0);
    expect(res.body.address).toBe('123 Main St');
    expect((pool.query as jest.Mock).mock.calls[2][0]).toMatch(/UPDATE clients c/);
  });
});
