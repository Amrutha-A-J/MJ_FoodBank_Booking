import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import {
  generatePasswordSetupToken,
  verifyPasswordSetupToken,
  markPasswordTokenUsed,
} from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

jest.mock('../src/db');
jest.mock('../src/utils/passwordSetupUtils');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));
jest.mock('bcrypt');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('requestPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks up by email across user tables', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 7, email: 'user@example.com', user_type: 'staff' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/UNION ALL/);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('staff', 7);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('handles username lookup for volunteers', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 5, email: 'vol@example.com' }],
    });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');
    const res = await request(app)
      .post('/auth/request-password-reset')
      .send({ username: 'vol' });
    expect(res.status).toBe(204);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 5);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
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
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });
});

describe('setPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      .send({ token: 'tok', password: 'Abcd1234!' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ loginPath: '/login/staff' });
    expect(bcrypt.hash).toHaveBeenCalledWith('Abcd1234!', 10);
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
      .send({ token: 'bad', password: 'Abcd1234!' });
    expect(res.status).toBe(400);
  });
});

describe('resendPasswordSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('requires an identifier', async () => {
    const res = await request(app)
      .post('/auth/resend-password-setup')
      .send({});
    expect(res.status).toBe(400);
  });
});
