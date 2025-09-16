import request from 'supertest';
import express from 'express';
import authRouter, { authLimiter } from '../src/routes/auth';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import {
  generatePasswordSetupToken,
  verifyPasswordSetupToken,
  markPasswordTokenUsed,
} from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';
import { resendLimit, RESEND_WINDOW_MS } from '../src/controllers/authController';

jest.mock('../src/utils/passwordSetupUtils', () => {
  const actual = jest.requireActual('../src/utils/passwordSetupUtils');
  return {
    ...actual,
    generatePasswordSetupToken: jest.fn(),
    verifyPasswordSetupToken: jest.fn(),
    markPasswordTokenUsed: jest.fn(),
  };
});
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));
jest.mock('bcrypt');
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
app.use('/auth', authRouter);
app.use('/users', usersRouter);

describe('requestPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks up volunteer by email across user tables', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 7, email: 'vol@example.com', user_type: 'volunteers' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ email: 'vol@example.com' });
    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/user_lookup/);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 7);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: config.passwordSetupTemplateId,
        params: expect.objectContaining({
          link: `${config.frontendOrigins[0]}/set-password?token=tok`,
          token: 'tok',
          role: 'volunteer',
          loginLink: `${config.frontendOrigins[0]}/login/volunteer`,
        }),
      }),
    );
  });


  it('handles clientId lookup for clients', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 3, email: 'client@example.com' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ clientId: 3 });
    expect(res.status).toBe(204);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('clients', 3);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: config.passwordSetupTemplateId,
        params: expect.objectContaining({
          link: `${config.frontendOrigins[0]}/set-password?token=tok`,
          token: 'tok',
          clientId: 3,
          role: 'client',
          loginLink: `${config.frontendOrigins[0]}/login`,
        }),
      }),
    );
  });

  it('skips sending email when client lacks email', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 4, email: null }],
    });
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ clientId: 4 });
    expect(res.status).toBe(204);
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
  });
});

describe('setPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resendLimit.clear();
  });

  it('verifies token, hashes password, and marks token used', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue({
      id: 1,
      user_type: 'staff',
      user_id: 7,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    const res = await request(app)
      .post('/auth/set-password')
      .send({ token: 'tok', password: 'TammyM@MJFB' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ loginPath: '/login/staff' });
    expect(bcrypt.hash).toHaveBeenCalledWith('TammyM@MJFB', 10);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'UPDATE staff SET password=$1 WHERE id=$2',
      ['hashed', 7],
    );
    expect(markPasswordTokenUsed).toHaveBeenCalledWith(1);
  });

  it('rejects expired token', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/auth/set-password')
      .send({ token: 'bad', password: 'TammyM@MJFB' });
    expect(res.status).toBe(400);
  });
});

describe('resendPasswordSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resendLimit.clear();
    authLimiter.resetKey('::ffff:127.0.0.1');
    authLimiter.resetKey('127.0.0.1');
    authLimiter.resetKey('::1');
    authLimiter.resetKey('::/56');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('generates a new token when looked up by email', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 9, email: 'resend@example.com', user_type: 'staff' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok2');
    const res = await request(app)
      .post('/auth/resend-password-setup')
      .send({ email: 'resend@example.com' });
    expect(res.status).toBe(204);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('staff', 9);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: config.passwordSetupTemplateId,
        params: expect.objectContaining({
          link: `${config.frontendOrigins[0]}/set-password?token=tok2`,
          token: 'tok2',
          role: 'staff',
          loginLink: `${config.frontendOrigins[0]}/login/staff`,
        }),
      }),
    );
  });

  it('does not send email when clientId has no email', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 5, email: null }],
    });
    const res = await request(app)
      .post('/auth/resend-password-setup')
      .send({ clientId: 5 });
    expect(res.status).toBe(204);
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it('requires an identifier', async () => {
    const res = await request(app)
      .post('/auth/resend-password-setup')
      .send({});
    expect(res.status).toBe(400);
  });

  it('clears rate limit after window', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 9, email: 'resend@example.com', user_type: 'staff' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok2');

    await request(app)
      .post('/auth/resend-password-setup')
      .send({ email: 'resend@example.com' });
    expect(resendLimit.has('resend@example.com')).toBe(true);

    jest.advanceTimersByTime(RESEND_WINDOW_MS);
    jest.runOnlyPendingTimers();

    expect(resendLimit.has('resend@example.com')).toBe(false);
  });
});

describe('createUser password flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashes password when provided and skips email link', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

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
        sendPasswordLink: false,
      });

    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret123!', 10);
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect((pool.query as jest.Mock).mock.calls[2][1][7]).toBe('hashed');
  });

  it('sends setup email when sendPasswordLink is true', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({});
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
        sendPasswordLink: true,
      });

    expect(res.status).toBe(201);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('clients', 123);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: config.passwordSetupTemplateId,
        params: expect.objectContaining({
          link: `${config.frontendOrigins[0]}/set-password?token=tok`,
          token: 'tok',
          clientId: 123,
          role: 'client',
          loginLink: `${config.frontendOrigins[0]}/login`,
        }),
      }),
    );
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});
