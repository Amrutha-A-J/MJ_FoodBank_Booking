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
app.use('/users', usersRouter);

describe('GET /users/id/:clientId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user details with online access and password flag', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          client_id: 5,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          phone: '123',
          address: '123 Main',
          online_access: true,
          password: 'hash',
          consent: true,
          role: 'delivery',
        },
      ],
    });

    const res = await request(app).get('/users/id/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '123',
      address: '123 Main',
      clientId: 5,
      onlineAccess: true,
      hasPassword: true,
      consent: true,
      role: 'delivery',
    });
    expect(pool.query).toHaveBeenCalledWith(
      `SELECT client_id, first_name, last_name, email, phone, address, online_access, password, consent, role\n       FROM clients WHERE client_id = $1`,
      [5],
    );
  });
});
