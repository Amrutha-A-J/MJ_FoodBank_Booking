jest.mock('../src/utils/opsAlert', () => ({ notifyOps: jest.fn() }));

import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendBookingEmail } from '../src/utils/bookingEmailHelpers';
import { notifyOps } from '../src/utils/opsAlert';

jest.mock('../src/utils/bookingEmailHelpers', () => ({
  sendBookingEmail: jest.fn().mockReturnValue({
    googleCalendarLink: '#g',
    appleCalendarLink: '#a',
    appleCalendarCancelLink: '#',
  }),
}));

afterAll(() => {
  jest.resetModules();
});

jest.mock('../src/utils/emailUtils', () => ({
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '#g',
    appleCalendarLink: '#a',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));
const enqueueEmailMock = sendBookingEmail as jest.Mock;
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

describe('rescheduleVolunteerBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queues a reschedule email with old and new times', async () => {
    const booking = { id: 1, volunteer_id: 2, slot_id: 3, date: '2030-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] }) // booking
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 1, max_volunteers: 5, start_time: '09:00', end_time: '12:00' }] }) // new slot
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // trained
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // existing
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // overlap
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] }) // count
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ start_time: '08:00', end_time: '09:00' }] }) // old slot
      .mockResolvedValueOnce({ rows: [{ email: 'vol@example.com' }] }) // email
      .mockResolvedValueOnce({}); // update

    const res = await request(app)
      .post('/volunteer-bookings/reschedule/token123')
      .send({ roleId: 4, date: '2030-09-05' });

    expect(res.status).toBe(200);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    const call = enqueueEmailMock.mock.calls[0][0];
    expect(call.to).toBe('vol@example.com');
    expect(call.params).toEqual(
      expect.objectContaining({
        oldDate: 'Sun, Sep 1, 2030',
        oldTime: '8:00 AM to 9:00 AM',
        newDate: 'Thu, Sep 5, 2030',
        newTime: '9:00 AM to 12:00 PM',
      }),
    );
    expect(call.calendar).toEqual(
      expect.objectContaining({ fileName: 'shift.ics', sequence: 1 }),
    );
    expect(call.cancelEvent).toEqual(
      expect.objectContaining({ fileName: 'shift-cancel.ics', sequence: 1 }),
    );
    expect(notifyOps).toHaveBeenCalled();
  });
});
