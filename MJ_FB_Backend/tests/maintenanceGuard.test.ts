import request from 'supertest';
import express from 'express';
import maintenanceGuard from '../src/middleware/maintenanceGuard';
import mockPool, { setQueryResults } from './utils/mockDb';

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
app.get('/maintenance', (_req, res) => res.sendStatus(200));
app.get('/auth/login', (_req, res) => res.sendStatus(200));
app.use((err: Error, _req, res, _next) => {
  res.status(500).json({ message: err.message });
});

const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
  process.env.NODE_ENV = 'production';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

afterEach(() => {
  (mockPool.query as jest.Mock).mockReset();
});

describe('maintenanceGuard', () => {
  it.each(['staff', 'admin'])(
    'bypasses DB lookup for %s users',
    async (role) => {
      const res = await request(app)
        .get('/protected')
        .set('x-user', JSON.stringify({ role }));
      expect(res.status).toBe(200);
      expect(mockPool.query).not.toHaveBeenCalled();
    },
  );

  it('returns 503 for non-privileged users when maintenance mode is on', async () => {
    setQueryResults({ rows: [{ value: 'true' }] });
    const res = await request(app).get('/protected');
    expect(res.status).toBe(503);
  });

  it.each(['/maintenance', '/auth/login'])(
    'allows %s during maintenance',
    async (path) => {
      setQueryResults({ rows: [{ value: 'true' }] });
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
    },
  );

  it('forwards database errors', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/protected');
    expect(res.status).toBe(500);
  });
});
