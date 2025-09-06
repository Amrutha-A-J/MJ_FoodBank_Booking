import request from 'supertest';
import express from 'express';
import sunshineBagRouter from '../src/routes/sunshineBags';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => {
    (_req as any).user = { id: 1, role: 'staff', access: ['pantry'] };
    next();
  },
  authorizeAccess: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/sunshine-bags', sunshineBagRouter);

describe('sunshine bag log', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockReset();
  });

  it('upserts sunshine bag weight and client count', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ date: '2024-01-01', weight: 5, clientCount: 3 }],
      rowCount: 1,
    });
    const res = await request(app)
      .post('/sunshine-bags')
      .send({ date: '2024-01-01', weight: 5, clientCount: 3 });
    expect(res.status).toBe(201);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('ON CONFLICT');
    expect(res.body).toEqual({ date: '2024-01-01', weight: 5, clientCount: 3 });
  });

  it('gets sunshine bag by date', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ date: '2024-01-01', weight: 7, clientCount: 2 }],
      rowCount: 1,
    });
    const res = await request(app).get('/sunshine-bags?date=2024-01-01');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ date: '2024-01-01', weight: 7, clientCount: 2 });
  });
});
