import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    outlookCalendarLink: '',
  }),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a recurring booking series', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ role_id: 2, max_volunteers: 3, category_name: 'Pantry' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValue({ rowCount: 0, rows: [{ count: '0' }] });

    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({ roleId: 2, startDate: '2025-01-01', endDate: '2025-01-03', pattern: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(10);
    expect(res.body.successes).toEqual([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
    ]);
    expect(res.body.skipped).toEqual([]);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(9);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'test@example.com',
      templateId: 0,
      params: expect.any(Object),
    });
  });

  it('skips dates that fail validation', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ role_id: 2, max_volunteers: 3, category_name: 'Pantry' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 20 }] })
      .mockResolvedValue({ rowCount: 0, rows: [{ count: '0' }] });

    const res = await request(app)
      .post('/volunteer-bookings/recurring')
      .send({
        roleId: 2,
        startDate: '2025-01-03',
        endDate: '2025-01-05',
        pattern: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(20);
    expect(res.body.successes).toEqual(['2025-01-03']);
    expect(res.body.skipped).toEqual([
      { date: '2025-01-04', reason: 'Role not bookable on holidays or weekends' },
      { date: '2025-01-05', reason: 'Role not bookable on holidays or weekends' },
    ]);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(3);
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
    const res = await request(app).delete(
      '/volunteer-bookings/recurring/10?from=2025-01-02',
    );
    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(3);
  });

  it('lists recurring bookings', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 1,
          role_id: 2,
          start_date: '2025-01-01',
          end_date: '2025-01-10',
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
        start_date: '2025-01-01',
        end_date: '2025-01-10',
        pattern: 'daily',
        days_of_week: [],
      },
    ]);
  });
});
