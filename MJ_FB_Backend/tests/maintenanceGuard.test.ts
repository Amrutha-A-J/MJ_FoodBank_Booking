import request from 'supertest';
import express from 'express';
import maintenanceGuard from '../src/middleware/maintenanceGuard';
import pool from '../src/db';

jest.mock('../src/db');

const app = express();
app.use((req, _res, next) => {
  const header = req.get('x-user');
  if (header) {
    req.user = JSON.parse(header);
  }
  next();
});
app.use(maintenanceGuard);
app.get('/protected', (_req, res) => res.sendStatus(200));

afterEach(() => {
  jest.clearAllMocks();
});

const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
  process.env.NODE_ENV = 'production';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe('maintenanceGuard', () => {
  it('blocks anonymous access during maintenance', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ value: 'true' }],
    });
    const res = await request(app).get('/protected');
    expect(res.status).toBe(503);
  });

  it('blocks non-staff users during maintenance', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ value: 'true' }],
    });
    const res = await request(app)
      .get('/protected')
      .set('x-user', JSON.stringify({ role: 'volunteer' }));
    expect(res.status).toBe(503);
  });

  it('allows staff during maintenance', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ value: 'true' }],
    });
    const res = await request(app)
      .get('/protected')
      .set('x-user', JSON.stringify({ role: 'staff' }));
    expect(res.status).toBe(200);
  });

  it('allows access when not in maintenance', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ value: 'false' }],
    });
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
  });
});
