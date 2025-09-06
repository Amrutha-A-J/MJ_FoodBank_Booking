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
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-staff']) {
      (req as any).user = { role: 'staff' };
    }
    next();
  },
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


describe('cancelVolunteerBookingOccurrence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends volunteer and coordinator emails when staff cancels occurrence', async () => {
    const booking = {
      id: 1,
      slot_id: 2,
      volunteer_id: 3,
      date: '2099-09-01',
      status: 'approved',
      recurring_id: null,
    };
    const slot = { start_time: '09:00:00', end_time: '12:00:00' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'vol@example.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [slot] });

    const res = await request(app)
      .patch('/volunteer-bookings/1/cancel')
      .set('x-staff', '1')
      .send({ reason: 'staff_cancelled' });

    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(3);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'vol@example.com',
      templateId: 0,
    });
    expect(sendTemplatedEmailMock.mock.calls[0][0].params.body).toContain('staff_cancelled');
  });

  it('does not send emails when volunteer cancels occurrence', async () => {
    const booking = {
      id: 1,
      slot_id: 2,
      volunteer_id: 3,
      date: '2099-09-01',
      status: 'approved',
      recurring_id: null,
    };
    const slot = { start_time: '09:00:00', end_time: '12:00:00' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'vol@example.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [slot] });

    const res = await request(app)
      .patch('/volunteer-bookings/1/cancel')
      .send({ reason: 'volunteer_cancelled' });

    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });
});

describe('cancelRecurringVolunteerBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends volunteer and coordinator emails when staff cancels recurring booking', async () => {
    const info = {
      volunteer_id: 3,
      slot_id: 2,
      email: 'vol@example.com',
      start_time: '09:00:00',
      end_time: '12:00:00',
    };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [info] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .delete('/volunteer-bookings/recurring/1')
      .set('x-staff', '1')
      .send({ reason: 'staff_cancelled' });

    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(3);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'vol@example.com',
      templateId: 0,
    });
    expect(sendTemplatedEmailMock.mock.calls[0][0].params.body).toContain('staff_cancelled');
  });

  it('does not send emails when volunteer cancels recurring booking', async () => {
    const info = {
      volunteer_id: 3,
      slot_id: 2,
      email: 'vol@example.com',
      start_time: '09:00:00',
      end_time: '12:00:00',
    };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [info] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .delete('/volunteer-bookings/recurring/1')
      .send({ reason: 'volunteer_cancelled' });

    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });
});

