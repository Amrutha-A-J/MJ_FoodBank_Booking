import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).user = { role: 'staff' };
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
app.use('/users', usersRouter);

describe('PATCH /users/id/:clientId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables online access without password', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        client_id: 5,
        first_name: 'Jane',
        last_name: 'Doe',
        email: null,
        phone: null,
        profile_link: 'link',
      }],
    });

    const res = await request(app)
      .patch('/users/id/5')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        onlineAccess: true,
      });
    expect(res.status).toBe(200);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    const params = (pool.query as jest.Mock).mock.calls[0][1];
    expect(params).toEqual(['Jane', 'Doe', null, null, null, null, '5']);
  });

  it('enables online access with password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        client_id: 5,
        first_name: 'Jane',
        last_name: 'Doe',
        email: null,
        phone: null,
        profile_link: 'link',
      }],
    });

    const res = await request(app)
      .patch('/users/id/5')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        onlineAccess: true,
        password: 'Secret1!',
      });
    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret1!', 10);
    const params = (pool.query as jest.Mock).mock.calls[0][1];
    expect(params[5]).toBe('hashed');
  });
});
