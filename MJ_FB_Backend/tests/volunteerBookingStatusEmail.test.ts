import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
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

  it('sends coordinator emails when booking is cancelled with reason', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'cancelled', recurring_id: null, reason: 'sick' },
        ],
      });

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'cancelled', reason: 'sick' });

    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[1][1][2]).toBe('sick');
    expect((sendEmail as jest.Mock).mock.calls).toHaveLength(2);
    expect((sendEmail as jest.Mock).mock.calls[0][0]).toBe('coordinator1@example.com');
    expect((sendEmail as jest.Mock).mock.calls[1][0]).toBe('coordinator2@example.com');
  });

  it('logs failure for one coordinator email but continues with others', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'cancelled', recurring_id: null, reason: 'sick' },
        ],
      });

    const sendEmailMock = sendEmail as jest.Mock;
    sendEmailMock.mockRejectedValueOnce(new Error('fail')).mockResolvedValue(undefined);
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'cancelled', reason: 'sick' });

    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to send coordinator email',
      expect.objectContaining({ email: 'coordinator1@example.com' }),
    );
    errorSpy.mockRestore();
  });

  it('requires reason when cancelling', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'approved' };
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
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'completed', recurring_id: null, reason: null },
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

  it('sends volunteer and coordinator emails when occurrence is cancelled', async () => {
    const booking = {
      id: 1,
      slot_id: 2,
      volunteer_id: 3,
      date: '2025-09-01',
      status: 'approved',
      recurring_id: null,
    };
    const slot = { start_time: '09:00:00', end_time: '12:00:00' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'vol@example.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [slot] });

    const res = await request(app).patch('/volunteer-bookings/1/cancel');

    expect(res.status).toBe(200);
    expect((sendEmail as jest.Mock).mock.calls).toHaveLength(3);
    expect((sendEmail as jest.Mock).mock.calls[0][0]).toBe('vol@example.com');
  });
});

