import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    outlookCalendarLink: '',
    appleCalendarLink: '',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
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
  optionalAuthMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

const client = { query: jest.fn(), release: jest.fn() } as any;

describe('createVolunteerBookingForVolunteer force', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.query.mockReset();
    (pool.connect as jest.Mock).mockResolvedValue(client);
  });

  it('increases capacity and creates booking when forced', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role_id: 2,
            max_volunteers: 1,
            start_time: '09:00:00',
            end_time: '12:00:00',
            category_name: 'Pantry',
            role_name: 'Greeter',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ max_volunteers: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({}) // UPDATE volunteer_slots
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            slot_id: 1,
            volunteer_id: 5,
            date: '2099-01-01',
            status: 'approved',
            reschedule_token: 'tok',
            recurring_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const res = await request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 5, roleId: 1, date: '2099-01-01', force: true });

    expect(res.status).toBe(201);
    const updateCall = client.query.mock.calls[3];
    expect(updateCall[0]).toMatch(
      /UPDATE volunteer_slots SET max_volunteers = \$1 WHERE slot_id = \$2/,
    );
    expect(updateCall[1]).toEqual([2, 1]);
  });
});
