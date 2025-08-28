import request from 'supertest';
import express from 'express';
import visitsRouter from '../src/routes/clientVisits';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';

jest.mock('../src/db');

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    const role = (req.headers['x-role'] as string) || 'shopper';
    const id = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
    req.user = { id, role };
    next();
  },
  authorizeRoles: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/visits', visitsRouter);
app.use('/bookings', bookingsRouter);

describe('client visit creates booking updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates booking to visited when visit is created', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1, date: '2024-01-01', clientId: 123, weightWithCart: 10, weightWithoutCart: 5, petItem: 0, anonymous: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, first_name: 'John', last_name: 'Doe' }], rowCount: 1 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 20, status: 'approved', request_data: 'note' }], rowCount: 1 })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/visits')
      .set('x-role', 'pantry')
      .send({ date: '2024-01-01', clientId: 123, weightWithCart: 10, weightWithoutCart: 5 });
    expect(res.status).toBe(201);
    const updateCall = (pool.query as jest.Mock).mock.calls.find((c: any[]) =>
      typeof c[0] === 'string' && c[0].includes('UPDATE bookings SET status')
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall[0]).toMatch(/UPDATE bookings SET status='visited'/);
    expect(updateCall[1][0]).toBe(20);
    expect(updateCall[1][1]).toBe('note');
  });

  it('returns a single history record after visit creation', async () => {
    (pool.query as jest.Mock)
      // POST /visits sequence
      .mockResolvedValueOnce({ rows: [{ id: 1, date: '2024-01-01', clientId: 123, weightWithCart: 10, weightWithoutCart: 5, petItem: 0, anonymous: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, first_name: 'John', last_name: 'Doe' }], rowCount: 1 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 20, status: 'approved', request_data: null }], rowCount: 1 })
      .mockResolvedValueOnce({})
      // GET /bookings/history sequence
      .mockResolvedValueOnce({ rows: [{ id: 20, status: 'visited', date: '2024-01-01', slot_id: 1, reason: null, start_time: '09:00', end_time: '10:00', created_at: '2024-01-01', is_staff_booking: false, reschedule_token: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app)
      .post('/visits')
      .set('x-role', 'pantry')
      .send({ date: '2024-01-01', clientId: 123, weightWithCart: 10, weightWithoutCart: 5 });

    const historyRes = await request(app)
      .get('/bookings/history?includeVisits=true')
      .set('x-role', 'shopper')
      .set('x-user-id', '5');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0].status).toBe('visited');
    const visitQuery = (pool.query as jest.Mock).mock.calls[6][0];
    expect(visitQuery).toMatch(/NOT EXISTS/);
  });
});
