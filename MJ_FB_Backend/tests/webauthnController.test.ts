import request from 'supertest';
import express from 'express';
import webauthnRoutes from '../src/routes/webauthn';
import pool from '../src/db';

jest.mock('../src/db');
// Targeted mock for issueAuthTokens
jest.mock('../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/webauthn', webauthnRoutes);

describe('webauthn routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a challenge without identifier', async () => {
    const res = await request(app).post('/api/v1/webauthn/challenge').send({});
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.registered).toBeUndefined();
  });

  it('returns registration status when identifier provided', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ user_identifier: 'foo@example.com', credential_id: 'cred1' }],
    });
    const res = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({ identifier: 'foo@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body).toMatchObject({ registered: true, credentialId: 'cred1' });
  });

  it('registers credential successfully', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({}) // saveCredential
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'Jane',
            last_name: 'Doe',
            user_id: null,
            consent: true,
            user_role: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // roles
    const res = await request(app)
      .post('/api/v1/webauthn/register')
      .send({ identifier: 'jane@example.com', credentialId: 'cred123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'Jane Doe',
      access: [],
      id: 1,
      consent: true,
    });
  });

  it('register returns 500 when missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/webauthn/register')
      .send({});
    expect(res.status).toBe(500);
  });

  it('register returns 500 on database error', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .post('/api/v1/webauthn/register')
      .send({ identifier: 'jane@example.com', credentialId: 'cred123' });
    expect(res.status).toBe(500);
  });

  it('verify returns 401 when credentialId missing', async () => {
    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send({});
    expect(res.status).toBe(401);
  });

  it('verify returns 500 on database error', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send({ credentialId: 'cred123' });
    expect(res.status).toBe(500);
  });

  it('verifies credential by id', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_identifier: '123', credential_id: 'abc' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 123, first_name: 'John', last_name: 'Doe', role: 'shopper' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app).post('/api/v1/webauthn/verify').send({ credentialId: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'shopper', name: 'John Doe', id: 123 });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE credential_id = \$1/);
  });

  it('returns 401 for unknown credential', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/api/v1/webauthn/verify').send({ credentialId: 'missing' });
    expect(res.status).toBe(401);
  });

  it('register returns 401 for invalid credentials', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post('/api/v1/webauthn/register')
      .send({ identifier: '123', credentialId: 'abc' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid credentials' });
  });

  it('verify returns 401 for invalid credentials', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_identifier: '123', credential_id: 'abc' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send({ credentialId: 'abc' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid credentials' });
  });
});
