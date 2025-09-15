import { createUser, loginUser, searchUsers, updateUserByClientId } from '../src/controllers/userController';
import { refreshToken } from '../src/controllers/authController';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../src/utils/logger';
import issueAuthTokens from '../src/utils/authUtils';

jest.mock('../src/db');
jest.mock('bcrypt');
// Targeted mock for issueAuthTokens to avoid overriding other exports
jest.mock('../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // createUser tests
  describe('createUser', () => {
    it('creates a user successfully', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // clientId check
        .mockResolvedValueOnce({}); // insert

      const req: any = {
        user: { role: 'staff' },
        body: { clientId: 1, role: 'shopper', onlineAccess: false },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User created' });
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('fails when email already exists', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // clientId check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }); // email check

      const req: any = {
        user: { role: 'staff' },
        body: {
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          clientId: 2,
          role: 'shopper',
          onlineAccess: true,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
    });
  });

  // login tests
  describe('loginUser', () => {
    it('logs in staff with correct credentials', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] }) // maintenance
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // volunteer lookup
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 5,
              first_name: 'Jane',
              last_name: 'Doe',
              email: 'jane@example.com',
              password: 'hashed',
              role: 'staff',
              access: ['admin'],
              consent: true,
            },
          ],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const req: any = {
        body: { email: 'jane@example.com', password: 'pw' },
      };
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        role: 'staff',
        name: 'Jane Doe',
        access: ['admin'],
        id: 5,
        consent: true,
      });
      expect(issueAuthTokens).toHaveBeenCalledWith(
        res,
        { id: 5, role: 'staff', type: 'staff', access: ['admin'] },
        'staff:5',
      );
    });

    it('rejects invalid password', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            { id: 1, first_name: 'A', last_name: 'B', email: 'a', password: 'hashed', role: 'staff', access: [], consent: false },
          ],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const req: any = { body: { email: 'a', password: 'pw' } };
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(issueAuthTokens).not.toHaveBeenCalled();
    });
  });

  // refreshToken tests
  describe('refreshToken', () => {
    it('refreshes tokens with valid cookie', async () => {
      const payload = { id: 1, role: 'staff', type: 'staff', jti: 'old' };
      const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        algorithm: 'HS256',
      });
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ token_id: 'old' }] })
        .mockResolvedValueOnce({});

      const req: any = { headers: { cookie: `refreshToken=${token}` } };
      const res: any = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };

      await refreshToken(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.cookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.any(Object));
    });

    it('clears cookies on invalid token', async () => {
      const payload = { id: 1, role: 'staff', type: 'staff', jti: 'bad' };
      const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        algorithm: 'HS256',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req: any = { headers: { cookie: `refreshToken=${token}` } };
      const res: any = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await refreshToken(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.clearCookie).toHaveBeenCalledWith('token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });

  // updateUser tests
  describe('updateUserByClientId', () => {
    it('rejects non-staff users', async () => {
      const req: any = {
        user: { role: 'volunteer' },
        params: { clientId: '1' },
        body: { firstName: 'A', lastName: 'B' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('logs errors from the database', async () => {
      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '1' },
        body: { firstName: 'A', lastName: 'B' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const err = new Error('db');
      (pool.query as jest.Mock).mockRejectedValue(err);
      const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      await updateUserByClientId(req, res, next);

      expect(spy).toHaveBeenCalledWith('Error updating user info:', err);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // listUsers/searchUsers tests
  describe('searchUsers', () => {
    it('returns empty array for short queries', async () => {
      const req: any = { query: { search: 'ab' } };
      const res: any = { json: jest.fn() };

      await searchUsers(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith([]);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('formats search pattern and queries DB', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            client_id: 1,
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            phone: '123',
            password: null,
          },
        ],
      });

      const req: any = { query: { search: '  John  Smith ' } };
      const res: any = { json: jest.fn() };

      await searchUsers(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM clients'),
        ['%John%Smith%'],
      );
      expect(res.json).toHaveBeenCalledWith([
        {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '123',
          client_id: 1,
          hasPassword: false,
        },
      ]);
    });
  });
});
