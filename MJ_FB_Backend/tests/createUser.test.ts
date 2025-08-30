import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/db');
jest.mock('../src/utils/passwordSetupUtils');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'staff' };
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

describe('POST /users/add-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates user and sends setup email', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // clientId check
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email check
      .mockResolvedValueOnce({}); // insert
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/users/add-client')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '123',
        clientId: 123,
        role: 'shopper',
        onlineAccess: true,
        password: 'Secret123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'User created' });
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('clients', 123);
    expect(sendTemplatedEmail).toHaveBeenCalled();
  });
});
