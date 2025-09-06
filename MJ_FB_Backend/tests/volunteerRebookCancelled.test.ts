import express from 'express';
import request from 'supertest';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    outlookCalendarLink: '',
    appleCalendarLink: '',
  }),
}));
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).user = { id: 1, email: 'vol@example.com', role: 'volunteer' };
    next();
  },
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

describe('rebooking after cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.query.mockReset();
    (pool.connect as jest.Mock).mockResolvedValue(client);
  });

  it('creates booking when previous one was cancelled', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role_id: 2,
            max_volunteers: 3,
            start_time: '09:00:00',
            end_time: '12:00:00',
            category_name: 'Front',
            role_name: 'Greeter',
          },
        ],
      }) // slot
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // trained
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // holiday
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // existing approved
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // overlap

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ max_volunteers: 3 }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            slot_id: 1,
            volunteer_id: 1,
            date: '2024-01-01',
            status: 'approved',
            reschedule_token: 'tok',
            recurring_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const res = await request(app)
      .post('/volunteer-bookings')
      .send({ roleId: 1, date: '2024-01-01' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 9, role_id: 1, status: 'approved' });
  });
});
