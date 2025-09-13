import request from 'supertest';
import express from 'express';

jest.mock('../src/utils/configCache', () => ({
  getCartTare: jest.fn().mockResolvedValue(7),
}));

const appConfigRouter = require('../src/routes/admin/appConfig').default;
const { getCartTare } = require('../src/utils/configCache');

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).user = { role: 'staff', access: ['pantry'] };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: (...allowed: string[]) => (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const access = ((req.user as any)?.access || []) as string[];
    if (allowed.some(a => access.includes(a))) return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
}));

const app = express();
app.use(express.json());
app.use('/app-config', appConfigRouter);

afterEach(() => {
  jest.clearAllMocks();
});

describe('app-config routes', () => {
  it('allows pantry staff to fetch config', async () => {
    const res = await request(app).get('/app-config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cartTare: 7 });
    expect(getCartTare).toHaveBeenCalled();
  });

  it('rejects updates from pantry staff', async () => {
    const res = await request(app).put('/app-config').send({ cartTare: 8 });
    expect(res.status).toBe(403);
  });
});
