import request from 'supertest';
import express from 'express';
import webauthnRoutes from '../src/routes/webauthn';
import pool from '../src/db';
import { saveWebAuthnCredential, findWebAuthnCredential } from '../src/models/webauthn';
import issueAuthTokens from '../src/utils/authUtils';

jest.mock('../src/models/webauthn');
jest.mock('../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: 1, role: 'shopper', type: 'user' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/webauthn', webauthnRoutes);

describe('WebAuthn routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockReset();
  });

  it('registers credential', async () => {
    const res = await request(app)
      .post('/api/webauthn/register')
      .send({ credentialId: 'cred' });
    expect(res.status).toBe(201);
    expect(saveWebAuthnCredential).toHaveBeenCalledWith(1, 'shopper', 'cred');
  });

  it('verifies credential for client', async () => {
    (findWebAuthnCredential as jest.Mock).mockResolvedValue({
      user_id: 1,
      user_type: 'shopper',
      credential_id: 'cred',
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 1, first_name: 'John', last_name: 'Doe', role: 'shopper' }],
    });
    const res = await request(app)
      .post('/api/webauthn/verify')
      .send({ credentialId: 'cred' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'shopper', name: 'John Doe', id: 1 });
    expect(issueAuthTokens).toHaveBeenCalled();
  });
});
