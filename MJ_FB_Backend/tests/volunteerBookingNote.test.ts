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
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (_req as any).user = { id: 1, email: 'vol@example.com', role: 'volunteer' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('createVolunteerBooking note', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the note when creating a booking', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 2, max_volunteers: 3, start_time: '09:00:00', end_time: '12:00:00', category_name: 'Pantry', role_name: 'Greeter' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] });

    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ max_volunteers: 3 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, slot_id: 1, volunteer_id: 1, date: '2030-09-02', status: 'approved', reschedule_token: 'tok', recurring_id: null, note: 'hello' }] })
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: clientQuery, release: jest.fn() });

    const res = await request(app)
      .post('/volunteer-bookings')
      .send({ roleId: 1, date: '2030-09-02', note: 'hello' });

    expect(res.status).toBe(201);
    expect(clientQuery.mock.calls[3][1][4]).toBe('hello');
  });
});
