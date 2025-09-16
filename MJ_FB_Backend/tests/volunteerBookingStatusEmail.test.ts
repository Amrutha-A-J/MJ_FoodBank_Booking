import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { notifyOps } from '../src/utils/opsAlert';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
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
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-staff']) {
      (req as any).user = { role: 'staff' };
    } else if (req.headers['x-volunteer']) {
      (req as any).user = { role: 'volunteer' };
    }
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-staff']) {
      (req as any).user = { role: 'staff' };
    } else if (req.headers['x-volunteer']) {
      (req as any).user = { role: 'volunteer' };
    }
    next();
  },
}));
jest.mock('../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

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

describe('cancelVolunteerBookingOccurrence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockCommonQueries({
    booking: bookingOverrides = {},
    volunteer: volunteerOverrides = {},
    slot: slotOverrides = {},
  }: {
    booking?: Partial<{
      id: number;
      slot_id: number;
      volunteer_id: number;
      date: string | Date;
      status: string;
      reschedule_token: string;
    }>;
    volunteer?: Partial<{
      email: string | null;
      first_name?: string | null;
      last_name?: string | null;
    }>;
    slot?: Partial<{ start_time: string; end_time: string }>;
  } = {}) {
    const booking = {
      id: 1,
      slot_id: 2,
      volunteer_id: 3,
      date: '2030-09-01',
      status: 'approved',
      reschedule_token: 'token',
      ...bookingOverrides,
    };
    const volunteer = {
      email: 'vol@example.com',
      first_name: 'A',
      last_name: 'B',
      ...volunteerOverrides,
    };
    const slot = { start_time: '09:00', end_time: '10:00', ...slotOverrides };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [volunteer] })
      .mockResolvedValueOnce({ rows: [slot] });
    return { booking, volunteer, slot };
  }

    it('sends email when staff cancels with reason', async () => {
      mockCommonQueries();
      const res = await request(app)
        .patch('/volunteer-bookings/1/cancel')
        .set('x-staff', '1')
        .send({ reason: 'sick' });
      expect(res.status).toBe(200);
      expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(1);
      expect(sendTemplatedEmailMock.mock.calls[0][0].to).toBe('vol@example.com');
      expect(sendTemplatedEmailMock.mock.calls[0][0].params.body).toContain('sick');
      expect(notifyOps).toHaveBeenCalled();
    });

  it('does not send email when volunteer cancels', async () => {
    mockCommonQueries();
    const res = await request(app)
      .patch('/volunteer-bookings/1/cancel')
      .send({ reason: 'sick' });
    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
    expect(notifyOps).toHaveBeenCalled();
  });

});

describe('cancelRecurringVolunteerBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRecurringQueries() {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ volunteer_id: 3, slot_id: 2, email: 'vol@example.com', start_time: '09:00', end_time: '10:00' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
  }

    it('does not send email when staff cancels recurring booking', async () => {
      mockRecurringQueries();
      const res = await request(app)
        .delete('/volunteer-bookings/recurring/1')
        .set('x-staff', '1')
        .send({ reason: 'sick' });
      expect(res.status).toBe(200);
      expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
    });

  it('does not send email when volunteer cancels recurring booking', async () => {
    mockRecurringQueries();
    const res = await request(app)
      .delete('/volunteer-bookings/recurring/1')
      .send({ reason: 'sick' });
    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });
});

