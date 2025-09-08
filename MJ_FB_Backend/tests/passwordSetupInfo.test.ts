import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import { verifyPasswordSetupToken } from '../src/utils/passwordSetupUtils';

jest.mock('../src/utils/passwordSetupUtils');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('getPasswordSetupInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns client ID for client tokens', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue({
      id: 1,
      user_type: 'clients',
      user_id: 5,
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 5 }],
    });
    const res = await request(app).get(
      '/auth/password-setup-info?token=tok',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userType: 'client', clientId: 5 });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT client_id FROM clients WHERE client_id=$1',
      [5],
    );
  });

  it('returns email for staff tokens', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue({
      id: 2,
      user_type: 'staff',
      user_id: 7,
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ email: 'staff@example.com' }],
    });
    const res = await request(app).get(
      '/auth/password-setup-info?token=tok',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userType: 'staff', email: 'staff@example.com' });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT email FROM staff WHERE id=$1',
      [7],
    );
  });

  it('returns email for volunteer tokens', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue({
      id: 3,
      user_type: 'volunteers',
      user_id: 8,
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ email: 'vol@example.com' }],
    });
    const res = await request(app).get(
      '/auth/password-setup-info?token=tok',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userType: 'volunteer', email: 'vol@example.com' });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT email FROM volunteers WHERE id=$1',
      [8],
    );
  });

  it('rejects invalid or expired tokens', async () => {
    (verifyPasswordSetupToken as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get(
      '/auth/password-setup-info?token=bad',
    );
    expect(res.status).toBe(400);
  });
});
