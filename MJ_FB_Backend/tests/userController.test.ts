import {
  createUser,
  deleteUserByClientId,
  getUserByClientId,
  getUserProfile,
  loginUser,
  searchUsers,
  updateMyProfile,
  updateUserByClientId,
} from '../src/controllers/userController';
import { refreshToken } from '../src/controllers/authController';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../src/utils/logger';
import issueAuthTokens from '../src/utils/authUtils';
import { getClientBookingsThisMonth } from '../src/controllers/clientVisitController';
import {
  buildPasswordSetupEmailParams,
  generatePasswordSetupToken,
} from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/db');
jest.mock('bcrypt');
// Targeted mock for issueAuthTokens to avoid overriding other exports
jest.mock('../src/utils/authUtils', () => {
  const actual = jest.requireActual('../src/utils/authUtils');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
  };
});
jest.mock('../src/controllers/clientVisitController', () => ({
  getClientBookingsThisMonth: jest.fn(),
}));
jest.mock('../src/utils/passwordSetupUtils', () => ({
  __esModule: true,
  generatePasswordSetupToken: jest.fn(),
  buildPasswordSetupEmailParams: jest.fn(),
}));
jest.mock('../src/utils/emailUtils', () => ({
  __esModule: true,
  sendTemplatedEmail: jest.fn(),
}));

const mockGetClientBookingsThisMonth =
  getClientBookingsThisMonth as jest.MockedFunction<
    typeof getClientBookingsThisMonth
  >;
const mockGeneratePasswordSetupToken =
  generatePasswordSetupToken as jest.MockedFunction<
    typeof generatePasswordSetupToken
  >;
const mockBuildPasswordSetupEmailParams =
  buildPasswordSetupEmailParams as jest.MockedFunction<
    typeof buildPasswordSetupEmailParams
  >;
const mockSendTemplatedEmail =
  sendTemplatedEmail as jest.MockedFunction<typeof sendTemplatedEmail>;

const defaultUserAgent = 'jest-agent/1.0';
function buildReq(overrides: Record<string, unknown> = {}) {
  const base = {
    get: jest.fn().mockImplementation((header: string) => {
      if (header && header.toLowerCase() === 'user-agent') {
        return defaultUserAgent;
      }
      return undefined;
    }),
  };
  return { ...base, ...overrides } as Record<string, unknown>;
}

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientBookingsThisMonth.mockReset();
    mockGetClientBookingsThisMonth.mockResolvedValue(0);
    mockGeneratePasswordSetupToken.mockReset();
    mockBuildPasswordSetupEmailParams.mockReset();
    mockSendTemplatedEmail.mockReset();
    mockSendTemplatedEmail.mockResolvedValue(undefined);
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

    it('sends password setup email when requested', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // clientId check
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email check
        .mockResolvedValueOnce({}); // insert
      mockGeneratePasswordSetupToken.mockResolvedValue('token-123');
      mockBuildPasswordSetupEmailParams.mockReturnValue({
        link: 'https://example.com',
        token: 'token-123',
      });

      const req: any = {
        user: { role: 'staff' },
        body: {
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          clientId: 42,
          role: 'shopper',
          onlineAccess: true,
          sendPasswordLink: true,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockGeneratePasswordSetupToken).toHaveBeenCalledWith('clients', 42);
      expect(mockBuildPasswordSetupEmailParams).toHaveBeenCalledWith(
        'clients',
        'token-123',
        42,
      );
      expect(mockSendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'a@b.com',
          params: { link: 'https://example.com', token: 'token-123' },
        }),
      );
    });

    it('rejects when client ID already exists', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{}] });

      const req: any = {
        user: { role: 'staff' },
        body: { clientId: 9, role: 'shopper', onlineAccess: false },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Client ID already exists' });
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserByClientId', () => {
    it('returns a user profile for staff lookup', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 3,
            first_name: 'Jamie',
            last_name: 'Doe',
            email: 'jamie@example.com',
            phone: '555-0000',
            address: '123 Main',
            online_access: true,
            password: 'hash',
            consent: true,
            role: 'delivery',
          },
        ],
      });

      const req: any = { params: { clientId: '3' } };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUserByClientId(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM clients WHERE client_id = $1'),
        ['3'],
      );
      expect(res.json).toHaveBeenCalledWith({
        firstName: 'Jamie',
        lastName: 'Doe',
        email: 'jamie@example.com',
        phone: '555-0000',
        address: '123 Main',
        clientId: 3,
        onlineAccess: true,
        hasPassword: true,
        consent: true,
        role: 'delivery',
      });
    });

    it('returns 404 when the client cannot be found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req: any = { params: { clientId: '99' } };
      const res: any = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
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

      const req: any = buildReq({
        body: { email: 'jane@example.com', password: 'pw' },
      });
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
        defaultUserAgent,
      );
    });

    it('logs in staff when email casing differs', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] }) // maintenance
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // volunteer lookup
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 7,
              first_name: 'Case',
              last_name: 'Insensitive',
              email: 'case@example.com',
              password: 'hashed',
              role: 'staff',
              access: ['reports'],
              consent: false,
            },
          ],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const req: any = buildReq({
        body: { email: '  CASE@EXAMPLE.COM  ', password: 'pw' },
      });
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        role: 'staff',
        name: 'Case Insensitive',
        access: ['reports'],
        id: 7,
        consent: false,
      });
      const volunteerCall = (pool.query as jest.Mock).mock.calls[1];
      expect(volunteerCall[1]).toEqual(['case@example.com']);
      const staffCall = (pool.query as jest.Mock).mock.calls[2];
      expect(staffCall[1]).toEqual(['case@example.com']);
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
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const req: any = buildReq({ body: { email: 'a', password: 'pw' } });
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password is incorrect.' });
      expect(issueAuthTokens).not.toHaveBeenCalled();
    });

    it('falls through volunteer mismatch and logs in matching client', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 9,
              first_name: 'V',
              last_name: 'Olunteer',
              password: 'vol-hash',
              consent: true,
              user_id: null,
              user_role: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              client_id: 42,
              first_name: 'Client',
              last_name: 'User',
              role: 'shopper',
              password: 'client-hash',
            },
          ],
        });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const req: any = buildReq({
        body: { email: 'client@example.com', password: 'pw' },
      });
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(issueAuthTokens).toHaveBeenCalledWith(
        res,
        { id: 42, role: 'shopper', type: 'user' },
        'user:42',
        defaultUserAgent,
      );
      expect(res.json).toHaveBeenCalledWith({
        role: 'shopper',
        name: 'Client User',
        id: 42,
      });
    });

    it('allows client login when volunteer password is pending setup', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 7,
              first_name: 'Pending',
              last_name: 'Volunteer',
              password: null,
              consent: false,
              user_id: null,
              user_role: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              client_id: 88,
              first_name: 'Ready',
              last_name: 'Client',
              role: 'delivery',
              password: 'client-hash',
            },
          ],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const req: any = buildReq({
        body: { email: 'ready@example.com', password: 'secret' },
      });
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(issueAuthTokens).toHaveBeenCalledWith(
        res,
        { id: 88, role: 'delivery', type: 'user' },
        'user:88',
        defaultUserAgent,
      );
      expect(res.json).toHaveBeenCalledWith({
        role: 'delivery',
        name: 'Ready Client',
        id: 88,
      });
    });

    it('continues to allow volunteer-only logins', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 17,
              first_name: 'Active',
              last_name: 'Volunteer',
              password: 'vol-hash',
              consent: true,
              user_id: null,
              user_role: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: [],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const req: any = buildReq({
        body: { email: 'vol@example.com', password: 'pw' },
      });
      const res: any = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await loginUser(req, res, jest.fn());

      expect(issueAuthTokens).toHaveBeenCalledWith(
        res,
        { id: 17, role: 'volunteer', type: 'volunteer' },
        'volunteer:17',
        defaultUserAgent,
      );
      expect(res.json).toHaveBeenCalledWith({
        role: 'volunteer',
        name: 'Active Volunteer',
        access: [],
        id: 17,
        consent: true,
      });
    });
  });

  // refreshToken tests
  describe('refreshToken', () => {
    it('refreshes tokens with valid cookie', async () => {
      const payload = { id: 1, role: 'staff', type: 'staff', jti: 'old' };
      const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        algorithm: 'HS256',
      });
      const future = new Date(Date.now() + 60_000).toISOString();
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ subject: 'staff:1', expires_at: future }],
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      const req: any = buildReq({ headers: { cookie: `refreshToken=${token}` } });
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

      const req: any = buildReq({ headers: { cookie: `refreshToken=${token}` } });
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

    it('activates online access and hashes a new password', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email uniqueness check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              client_id: 7,
              first_name: 'Sam',
              last_name: 'Client',
              email: 'sam@example.com',
              phone: '123',
              address: '123 Main',
              profile_link: 'profile',
              consent: false,
            },
          ],
        });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');

      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '7' },
        body: {
          firstName: 'Sam',
          lastName: 'Client',
          email: 'sam@example.com',
          phone: '123',
          address: '123 Main',
          onlineAccess: true,
          password: 'Reset123!',
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      expect(bcrypt.hash).toHaveBeenCalledWith('Reset123!', 10);
      const updateCall = (pool.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('online_access = true');
      expect(updateCall[1]).toEqual([
        'Sam',
        'Client',
        'sam@example.com',
        '123',
        '123 Main',
        'hashed-secret',
        '7',
      ]);
      expect(res.json).toHaveBeenCalledWith({
        clientId: 7,
        firstName: 'Sam',
        lastName: 'Client',
        email: 'sam@example.com',
        phone: '123',
        address: '123 Main',
        profileLink: 'profile',
        consent: false,
      });
    });

    it('returns 400 when email is already taken while enabling access', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{}] });

      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '7' },
        body: {
          firstName: 'Sam',
          lastName: 'Client',
          email: 'taken@example.com',
          phone: '123',
          address: '123 Main',
          onlineAccess: true,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when enabling access for a missing user', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');

      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '7' },
        body: {
          firstName: 'Sam',
          lastName: 'Client',
          email: 'sam@example.com',
          phone: '123',
          address: '123 Main',
          onlineAccess: true,
          password: 'Reset123!',
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('updates contact information without enabling online access', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 8,
            first_name: 'Taylor',
            last_name: 'Client',
            email: 'taylor@example.com',
            phone: '456',
            address: '789 Pine',
            profile_link: 'profile',
            consent: true,
          },
        ],
      });

      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '8' },
        body: {
          firstName: 'Taylor',
          lastName: 'Client',
          email: 'taylor@example.com',
          phone: '456',
          address: '789 Pine',
          onlineAccess: false,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      const queryText = (pool.query as jest.Mock).mock.calls[0][0];
      expect(queryText).not.toContain('online_access = true');
      expect(res.json).toHaveBeenCalledWith({
        clientId: 8,
        firstName: 'Taylor',
        lastName: 'Client',
        email: 'taylor@example.com',
        phone: '456',
        address: '789 Pine',
        profileLink: 'profile',
        consent: true,
      });
    });

    it('returns 404 when updating a non-existent client without online access', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req: any = {
        user: { role: 'staff' },
        params: { clientId: '8' },
        body: {
          firstName: 'Taylor',
          lastName: 'Client',
          email: 'taylor@example.com',
          phone: '456',
          address: '789 Pine',
          onlineAccess: false,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('deleteUserByClientId', () => {
    it('deletes a client successfully', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const req: any = { user: { role: 'staff' }, params: { clientId: '3' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await deleteUserByClientId(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM clients WHERE client_id = $1'),
        ['3'],
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted' });
    });

    it('returns 404 when the user is not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const req: any = { user: { role: 'staff' }, params: { clientId: '3' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await deleteUserByClientId(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('returns 409 when delete conflicts with related records', async () => {
      const conflictError = new Error('conflict') as Error & { code: string };
      conflictError.code = '23503';
      (pool.query as jest.Mock).mockRejectedValueOnce(conflictError);
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

      const req: any = { user: { role: 'staff' }, params: { clientId: '3' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await deleteUserByClientId(req, res, jest.fn());

      expect(warnSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cannot delete user with existing records',
      });
      warnSpy.mockRestore();
    });
  });

  describe('getUserProfile', () => {
    it('returns client profile with address', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 7,
            first_name: 'Sam',
            last_name: 'Client',
            email: 'sam@example.com',
            phone: '555-1234',
            address: '123 Main St',
            role: 'delivery',
            consent: true,
          },
        ],
      });
      mockGetClientBookingsThisMonth.mockResolvedValueOnce(2);

      const req: any = { user: { id: 7, type: 'user' } };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUserProfile(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM clients WHERE client_id = $1'),
        [7],
      );
      expect(mockGetClientBookingsThisMonth).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith({
        firstName: 'Sam',
        lastName: 'Client',
        email: 'sam@example.com',
        phone: '555-1234',
        address: '123 Main St',
        clientId: 7,
        role: 'delivery',
        bookingsThisMonth: 2,
        consent: true,
      });
    });

    it('returns staff profile with access roles', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 5,
            first_name: 'Staff',
            last_name: 'Member',
            email: 'staff@example.com',
            access: ['admin'],
            consent: false,
          },
        ],
      });

      const req: any = { user: { id: 5, type: 'staff' } };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUserProfile(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM staff WHERE id = $1'),
        [5],
      );
      expect(res.json).toHaveBeenCalledWith({
        id: 5,
        firstName: 'Staff',
        lastName: 'Member',
        email: 'staff@example.com',
        phone: null,
        address: null,
        role: 'staff',
        roles: ['admin'],
        consent: false,
      });
    });

    it('returns 404 for missing staff record', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req: any = { user: { id: 99, type: 'staff' } };
      const res: any = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('updateMyProfile', () => {
    it('updates client address', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 7,
            first_name: 'Sam',
            last_name: 'Client',
            email: 'sam@example.com',
            phone: '555-1234',
            address: '456 Oak Ave',
            role: 'delivery',
            consent: true,
          },
        ],
      });
      mockGetClientBookingsThisMonth.mockResolvedValueOnce(3);

      const req: any = {
        user: { id: 7, type: 'user' },
        body: { address: '456 Oak Ave' },
      };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await updateMyProfile(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('address = COALESCE($3, address)'),
        [null, undefined, '456 Oak Ave', 7],
      );
      expect(mockGetClientBookingsThisMonth).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith({
        firstName: 'Sam',
        lastName: 'Client',
        email: 'sam@example.com',
        phone: '555-1234',
        address: '456 Oak Ave',
        clientId: 7,
        role: 'delivery',
        bookingsThisMonth: 3,
        consent: true,
      });
    });

    it('updates staff email only and returns roles', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 4,
            first_name: 'Staff',
            last_name: 'User',
            email: 'updated@example.com',
            access: ['donor_management'],
            consent: true,
          },
        ],
      });

      const req: any = {
        user: { id: 4, type: 'staff' },
        body: { email: 'updated@example.com' },
      };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await updateMyProfile(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE staff SET email = COALESCE($1, email)'),
        ['updated@example.com', 4],
      );
      expect(res.json).toHaveBeenCalledWith({
        id: 4,
        firstName: 'Staff',
        lastName: 'User',
        email: 'updated@example.com',
        phone: null,
        address: null,
        role: 'staff',
        roles: ['donor_management'],
        consent: true,
      });
    });

    it('returns 404 when staff profile is missing', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req: any = {
        user: { id: 4, type: 'staff' },
        body: { email: 'updated@example.com' },
      };
      const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await updateMyProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
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

    it('uses the default pagination limit even when limit and offset are provided', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const req: any = {
        query: { search: 'Taylor', limit: '10', offset: '5' },
      };
      const res: any = { json: jest.fn() };

      await searchUsers(req, res, jest.fn());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5'),
        ['%Taylor%'],
      );
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
