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

describe('listUnmarkedVolunteerBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns past approved bookings', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          status: 'approved',
          role_id: 2,
          volunteer_id: 3,
          date: '2024-01-01',
          reschedule_token: 'abc',
          recurring_id: null,
          start_time: '09:00:00',
          end_time: '12:00:00',
          max_volunteers: 5,
          role_name: 'Pantry',
          category_name: 'Food',
          volunteer_name: 'Jane Doe',
        },
      ],
    });

    const res = await request(app).get('/volunteer-bookings/unmarked');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 1,
      status: 'approved',
      volunteer_name: 'Jane Doe',
      status_color: 'green',
    });
  });

  it('is also accessible via /review', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          status: 'approved',
          role_id: 2,
          volunteer_id: 3,
          date: '2024-01-01',
          reschedule_token: 'abc',
          recurring_id: null,
          start_time: '09:00:00',
          end_time: '12:00:00',
          max_volunteers: 5,
          role_name: 'Pantry',
          category_name: 'Food',
          volunteer_name: 'Jane Doe',
        },
      ],
    });

    const res = await request(app).get('/volunteer-bookings/review');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 1,
      status: 'approved',
      volunteer_name: 'Jane Doe',
      status_color: 'green',
    });
  });
});
