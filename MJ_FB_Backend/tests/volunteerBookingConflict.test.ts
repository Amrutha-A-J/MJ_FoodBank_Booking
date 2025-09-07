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
    ( _req as any).user = { id: 1, email: 'test@example.com', role: 'volunteer' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('volunteer booking conflict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 409 with attempted and existing booking', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 2, max_volunteers: 3, start_time: '09:00:00', end_time: '12:00:00', category_name: 'Front', role_name: 'Greeter' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, role_id: 3, date: '2024-01-02', start_time: '10:00:00', end_time: '13:00:00', role_name: 'Sorter' }] });

    const res = await request(app)
      .post('/volunteer-bookings')
      .send({ roleId: 1, date: '2024-01-02' });

    expect(res.status).toBe(409);
    expect(res.body.attempted).toEqual({
      role_id: 1,
      role_name: 'Greeter',
      date: '2024-01-02',
      start_time: '09:00:00',
      end_time: '12:00:00',
    });
    expect(res.body.existing).toEqual({
      id: 5,
      role_id: 3,
      role_name: 'Sorter',
      date: '2024-01-02',
      start_time: '10:00:00',
      end_time: '13:00:00',
    });
  });

  it('replaces booking when resolving conflict', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, role_id: 3, date: '2024-01-02', start_time: '10:00:00', end_time: '13:00:00', role_name: 'Sorter' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 2, max_volunteers: 3, start_time: '09:00:00', end_time: '12:00:00', category_name: 'Front', role_name: 'Greeter' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 9, slot_id: 1, volunteer_id: 1, date: '2024-01-02', status: 'approved', reschedule_token: 'tok' }] });

    const res = await request(app)
      .post('/volunteer-bookings/resolve-conflict')
      .send({ existingBookingId: 5, roleId: 1, date: '2024-01-02', keep: 'new' });

    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ id: 9, role_id: 1, date: '2024-01-02' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE volunteer_bookings SET status=$1, reason=$2 WHERE id=$3',
      ['cancelled', 'conflict', 5],
    );
  });

  it('keeps existing booking when resolving conflict', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 5,
          role_id: 3,
          date: '2024-01-02',
          start_time: '10:00:00',
          end_time: '13:00:00',
          role_name: 'Sorter',
        },
      ],
    });

    const res = await request(app)
      .post('/volunteer-bookings/resolve-conflict')
      .send({ existingBookingId: 5, keep: 'existing' });

    expect(res.status).toBe(200);
    expect(res.body.kept).toBe('existing');
    expect(res.body.booking).toEqual({
      id: 5,
      role_id: 3,
      role_name: 'Sorter',
      date: '2024-01-02',
      start_time: '10:00:00',
      end_time: '13:00:00',
    });
  });
});
