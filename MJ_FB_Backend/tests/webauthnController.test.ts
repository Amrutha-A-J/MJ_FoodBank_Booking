import request from 'supertest';
import express from 'express';
import webauthnRoutes from '../src/routes/webauthn';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/utils/authUtils', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve()) }));

const app = express();
app.use(express.json());
app.use('/api/webauthn', webauthnRoutes);

describe('webauthn routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a challenge without identifier', async () => {
    const res = await request(app).post('/api/webauthn/challenge').send({});
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.registered).toBeUndefined();
  });

  it('verifies credential by id', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_identifier: '123', credential_id: 'abc' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 123, first_name: 'John', last_name: 'Doe', role: 'shopper' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app).post('/api/webauthn/verify').send({ credentialId: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'shopper', name: 'John Doe', id: 123 });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE credential_id = \$1/);
  });

  it('returns 401 for unknown credential', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/api/webauthn/verify').send({ credentialId: 'missing' });
    expect(res.status).toBe(401);
  });
});
