import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import {
  cancelRecurringVolunteerBooking,
} from '../src/controllers/volunteer/volunteerBookingController';
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { setHolidays } from '../src/utils/holidayCache';

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
const getNextFriday = () => {
  const d = new Date();
  const delta = (5 - d.getUTCDay() + 7) % 7;
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
  const client = { query: jest.fn(), release: jest.fn() } as any;
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(client);
    client.query.mockReset();
    setHolidays(null);
  });

  it('rejects an invalid start date', async () => {
    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: 'not-a-date',
        endDate: formatDate(addDays(new Date(), 1)),
        pattern: 'daily',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid date' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects an invalid end date', async () => {
    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: formatDate(addDays(new Date(), 1)),
        endDate: 'bad-date',
        pattern: 'weekly',
        daysOfWeek: [1],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid date' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('creates a recurring booking series', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1 }) // trained
      .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // insert recurring
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // holidays table check
      .mockResolvedValueOnce({ rows: [] }) // capacity counts
      .mockResolvedValueOnce({ rows: [] }) // existing
      .mockResolvedValueOnce({ rows: [] }) // overlaps
      .mockResolvedValueOnce({ rows: [] }); // holidays
    client.query.mockResolvedValue({});

    const start = getNextMonday();
    const end = addDays(start, 2);
    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: formatDate(start),
        endDate: formatDate(end),
        pattern: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(10);
    expect(res.body.successes).toEqual([
      formatDate(start),
      formatDate(addDays(start, 1)),
      formatDate(end),
    ]);
    expect(res.body.skipped).toEqual([]);
    expect((pool.query as jest.Mock).mock.calls.length).toBe(8);
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('skips dates that fail validation', async () => {
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
      .mockResolvedValueOnce({ rows: [{ id: 20 }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    client.query.mockResolvedValue({});

    const start = getNextFriday();
    const end = addDays(start, 2);
    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: formatDate(start),
        endDate: formatDate(end),
        pattern: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(20);
    expect(res.body.successes).toEqual([formatDate(start)]);
    expect(res.body.skipped).toEqual([
      {
        date: formatDate(addDays(start, 1)),
        reason: 'Role not bookable on holidays or weekends',
      },
      {
        date: formatDate(end),
        reason: 'Role not bookable on holidays or weekends',
      },
    ]);
    expect((pool.query as jest.Mock).mock.calls.length).toBe(8);
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('handles large date ranges and reports skipped reasons', async () => {
    const start = getNextMonday();
    const end = addDays(start, 29);
    const holiday = addDays(start, 1);
    const fullDate = addDays(start, 2);
    const existing = addDays(start, 3);
    const overlap = addDays(start, 4);

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
      .mockResolvedValueOnce({ rows: [{ id: 40 }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ date: formatDate(fullDate), count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ date: formatDate(existing) }] })
      .mockResolvedValueOnce({ rows: [{ date: formatDate(overlap) }] })
      .mockResolvedValueOnce({ rows: [{ date: formatDate(holiday) }] });
    client.query.mockResolvedValue({});

    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: formatDate(start),
        endDate: formatDate(end),
        pattern: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(40);
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([
        {
          date: formatDate(holiday),
          reason: 'Role not bookable on holidays or weekends',
        },
        { date: formatDate(fullDate), reason: 'Role is full' },
        { date: formatDate(existing), reason: 'Already booked' },
        { date: formatDate(overlap), reason: 'Overlapping booking' },
      ]),
    );
    expect((pool.query as jest.Mock).mock.calls.length).toBe(8);
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('cancels future recurring bookings', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            volunteer_id: 1,
            slot_id: 2,
            email: 'test@example.com',
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
      user: { role: 'volunteer' },
    } as any;
    const json = jest.fn();
    const res: any = { json };
    const next = jest.fn();
    await cancelRecurringVolunteerBooking(req, res, next);
    expect(json).toHaveBeenCalledWith({ message: 'Recurring bookings cancelled' });
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });

  it('lists recurring bookings', async () => {
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
    const res = await request(app).get('/volunteer-bookings/recurring');
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
});
