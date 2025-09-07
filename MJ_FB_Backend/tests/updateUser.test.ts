import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'staff' };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

jest.mock('bcrypt');

const app = express();
app.use(express.json());
app.use('/users', usersRouter);

describe('PATCH /users/id/:clientId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables online access with password', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          client_id: 1,
          first_name: 'Jane',
          last_name: 'Doe',
          email: null,
          phone: null,
          profile_link: 'link',
        },
      ],
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app)
      .patch('/users/id/1')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        onlineAccess: true,
        password: 'Secret123!',
      });

    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret123!', 10);
    expect(pool.query.mock.calls[0][0]).toMatch(/password = \$5/);
    expect(pool.query.mock.calls[0][1][4]).toBe('hashed');
  });

  it('enables online access without password', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          client_id: 1,
          first_name: 'Jane',
          last_name: 'Doe',
          email: null,
          phone: null,
          profile_link: 'link',
        },
      ],
    });

    const res = await request(app)
      .patch('/users/id/1')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        onlineAccess: true,
      });

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).not.toMatch(/password/);
    expect(pool.query.mock.calls[0][1]).toEqual([
      'Jane',
      'Doe',
      null,
      null,
      '1',
    ]);
  });
});
