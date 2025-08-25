import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'volunteer', email: 'test@example.com' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('recurring volunteer bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a recurring booking series', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValue({});

    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({ roleId: 2, startDate: '2025-01-01', endDate: '2025-01-03', pattern: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('recurringId', 10);
    expect((pool.query as jest.Mock).mock.calls.length).toBe(1 + 3); // 3 dates
  });

  it('cancels future recurring bookings', async () => {
    (pool.query as jest.Mock).mockResolvedValue({});
    const res = await request(app).delete('/volunteer-bookings/recurring/10?from=2025-01-02');
    expect(res.status).toBe(200);
    const firstCall = (pool.query as jest.Mock).mock.calls[0][0];
    expect(firstCall).toMatch(/UPDATE volunteer_bookings SET status='cancelled'/);
  });
});
