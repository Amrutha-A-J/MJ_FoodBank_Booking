import request from 'supertest';
import express from 'express';
import maintenanceGuard from '../../src/middleware/maintenanceGuard';
import mockPool, { setQueryResults } from '../utils/mockDb';

const app = express();
app.set('trust proxy', true);
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

const originalNodeEnv = process.env.NODE_ENV;
const originalMaintenanceMode = process.env.MAINTENANCE_MODE;
const originalMaintenanceAllowIps = process.env.MAINTENANCE_ALLOW_IPS;

type OverrideKey = 'MAINTENANCE_MODE' | 'MAINTENANCE_ALLOW_IPS';

function restoreEnv(key: OverrideKey, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

beforeAll(() => {
  process.env.NODE_ENV = 'production';
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
  restoreEnv('MAINTENANCE_MODE', originalMaintenanceMode);
  restoreEnv('MAINTENANCE_ALLOW_IPS', originalMaintenanceAllowIps);
});

afterEach(() => {
  (mockPool.query as jest.Mock).mockReset();
  restoreEnv('MAINTENANCE_MODE', originalMaintenanceMode);
  restoreEnv('MAINTENANCE_ALLOW_IPS', originalMaintenanceAllowIps);
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

  describe('MAINTENANCE_MODE override', () => {
    it('blocks requests when MAINTENANCE_MODE is true', async () => {
      process.env.MAINTENANCE_MODE = 'true';
      const res = await request(app).get('/protected');
      expect(res.status).toBe(503);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it.each(['/maintenance', '/auth/login'])(
      'allows %s when MAINTENANCE_MODE is true',
      async (path) => {
        process.env.MAINTENANCE_MODE = 'true';
        const res = await request(app).get(path);
        expect(res.status).toBe(200);
        expect(mockPool.query).not.toHaveBeenCalled();
      },
    );

    it('allows whitelisted IPs when MAINTENANCE_MODE is true', async () => {
      process.env.MAINTENANCE_MODE = 'true';
      process.env.MAINTENANCE_ALLOW_IPS = '203.0.113.42';
      const res = await request(app)
        .get('/protected')
        .set('x-forwarded-for', '203.0.113.42');
      expect(res.status).toBe(200);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('allows normal operation when MAINTENANCE_MODE is false', async () => {
      process.env.MAINTENANCE_MODE = 'false';
      const res = await request(app).get('/protected');
      expect(res.status).toBe(200);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });
});
