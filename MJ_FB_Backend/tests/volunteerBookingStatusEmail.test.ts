import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    outlookCalendarLink: '',
  }),
}));
const sendTemplatedEmailMock = sendTemplatedEmail as jest.Mock;
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

describe('updateVolunteerBookingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not send emails when booking is cancelled with reason', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2030-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2030-09-01', status: 'cancelled', recurring_id: null, reason: 'sick' },
        ],
      });

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'cancelled', reason: 'sick' });

    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[1][1][2]).toBe('sick');
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });

  it('requires reason when cancelling', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2030-09-01', status: 'approved' };
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [booking] });

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
  });

  it('rejects visited status with guidance', async () => {
    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'visited' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/completed/);
    expect((pool.query as jest.Mock)).not.toHaveBeenCalled();
  });

  it('allows status completed', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2030-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2030-09-01', status: 'completed', recurring_id: null, reason: null },
        ],
      });

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
  });
});

