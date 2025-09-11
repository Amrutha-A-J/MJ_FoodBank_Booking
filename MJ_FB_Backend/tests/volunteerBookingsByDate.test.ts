import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    appleCalendarLink: '',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  authorizeAccess: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  optionalAuthMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('listVolunteerBookingsByDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns bookings for a valid date', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          status: 'approved',
          role_id: 2,
          volunteer_id: 3,
          date: '2025-01-01',
          reschedule_token: 'abc',
          start_time: '09:00:00',
          end_time: '12:00:00',
          max_volunteers: 5,
          role_name: 'Pantry',
          category_name: 'Food',
          volunteer_name: 'John Doe',
        },
      ],
    });

    const res = await request(app)
      .get('/volunteer-bookings/by-date')
      .query({ date: '2025-01-01' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query).toHaveBeenCalled();
  });

  it('returns empty array when no bookings found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/volunteer-bookings/by-date')
      .query({ date: '2025-01-02' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('rejects invalid date format', async () => {
    const res = await request(app)
      .get('/volunteer-bookings/by-date')
      .query({ date: 'invalid-date' });

    expect(res.status).toBe(400);
  });
});

