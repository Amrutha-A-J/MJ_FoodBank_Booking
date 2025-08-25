import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-staff']) {
      (req as any).user = { role: 'staff' };
    }
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('rescheduleVolunteerBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to pending when volunteer reschedules', async () => {
    const booking = { id: 1, volunteer_id: 2, status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 1, max_volunteers: 5 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/volunteer-bookings/reschedule/token123')
      .send({ roleId: 4, date: '2025-09-01' });

    expect(res.status).toBe(200);
    const updateCall = (pool.query as jest.Mock).mock.calls[4];
    expect(updateCall[1][3]).toBe('pending');
  });

  it('keeps status when staff reschedules', async () => {
    const booking = { id: 1, volunteer_id: 2, status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 1, max_volunteers: 5 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/volunteer-bookings/reschedule/token123')
      .set('x-staff', 'true')
      .send({ roleId: 4, date: '2025-09-01' });

    expect(res.status).toBe(200);
    const updateCall = (pool.query as jest.Mock).mock.calls[4];
    expect(updateCall[1][3]).toBe('approved');
  });
});
