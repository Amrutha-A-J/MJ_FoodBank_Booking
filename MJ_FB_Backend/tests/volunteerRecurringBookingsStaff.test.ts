import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import {
  cancelRecurringVolunteerBooking,
} from '../src/controllers/volunteer/volunteerBookingController';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};
const getNextMonday = () => {
  const d = new Date();
  const delta = (8 - d.getUTCDay()) % 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
};

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
const sendTemplatedEmailMock = sendTemplatedEmail as jest.Mock;
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'staff', email: 'staff@example.com' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('staff recurring volunteer bookings', () => {
  const client = { query: jest.fn(), release: jest.fn() } as any;
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(client);
    client.query.mockReset();
  });

  it('creates recurring bookings for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role_id: 2,
            max_volunteers: 3,
            category_name: 'Pantry',
            start_time: '09:00:00',
            end_time: '12:00:00',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ email: 'vol@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    client.query.mockResolvedValue({});

    const start = getNextMonday();
    const end = addDays(start, 2);
    const res = await request(app)
      .post('/volunteer-bookings/recurring/staff')
      .send({
        volunteerId: 5,
        roleId: 2,
        startDate: formatDate(start),
        endDate: formatDate(end),
        pattern: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(30);
    expect(res.body.successes).toEqual([
      formatDate(start),
      formatDate(addDays(start, 1)),
      formatDate(end),
    ]);
    expect(res.body.skipped).toEqual([]);
    expect((pool.query as jest.Mock).mock.calls.length).toBe(8);
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('returns 400 when start or end date is invalid', async () => {
    const res = await request(app)
      .post('/volunteer-bookings/recurring/staff')
      .send({
        volunteerId: 5,
        roleId: 2,
        startDate: 'invalid-date',
        endDate: '2024-01-01',
        pattern: 'daily',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid date' });
    expect((pool.query as jest.Mock).mock.calls.length).toBe(0);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('lists recurring bookings for a volunteer', async () => {
    const start = getNextMonday();
    const end = addDays(start, 9);
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 1,
          role_id: 2,
          start_date: formatDate(start),
          end_date: formatDate(end),
          pattern: 'daily',
          days_of_week: [],
        },
      ],
    });
    const res = await request(app).get('/volunteer-bookings/recurring/volunteer/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        role_id: 2,
        start_date: formatDate(start),
        end_date: formatDate(end),
        pattern: 'daily',
        days_of_week: [],
      },
    ]);
  });

  it('cancels future recurring bookings for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            volunteer_id: 5,
            slot_id: 2,
            email: 'vol@example.com',
            start_time: '09:00:00',
            end_time: '12:00:00',
          },
        ],
      })
      .mockResolvedValue({});

    const from = formatDate(addDays(getNextMonday(), 1));
    const req = {
      params: { id: '10' },
      query: { from },
      body: {},
      user: { role: 'staff' },
    } as any;
    const json = jest.fn();
    const res: any = { json };
    const next = jest.fn();
    await cancelRecurringVolunteerBooking(req, res, next);

    expect(json).toHaveBeenCalledWith({ message: 'Recurring bookings cancelled' });
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });
});
