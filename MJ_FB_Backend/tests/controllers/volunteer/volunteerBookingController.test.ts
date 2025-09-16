import '../../setupTests';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

import * as crypto from 'crypto';

jest.mock('../../../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: jest
    .fn()
    .mockReturnValue({ cancelLink: 'cancel-link', rescheduleLink: 'reschedule-link' }),
  buildCalendarLinks: jest.fn().mockReturnValue({
    googleCalendarLink: 'google-link',
    appleCalendarLink: 'apple-link',
    icsContent: 'BEGIN:VCALENDAR',
  }),
  saveIcsFile: jest.fn().mockReturnValue('cancel-ics-link'),
}));

jest.mock('../../../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

jest.mock('../../../src/utils/calendarLinks', () => ({
  buildIcsFile: jest.fn().mockReturnValue('CANCEL_ICS_CONTENT'),
}));

jest.mock('../../../src/utils/holidayCache', () => ({
  isHoliday: jest.fn().mockResolvedValue(false),
  getHolidays: jest.fn(),
}));

import mockPool from '../../utils/mockDb';
import {
  createVolunteerBooking,
  createVolunteerBookingForVolunteer,
  rescheduleVolunteerBooking,
  cancelVolunteerBookingOccurrence,
} from '../../../src/controllers/volunteer/volunteerBookingController';
import { enqueueEmail } from '../../../src/utils/emailQueue';
import {
  sendTemplatedEmail,
  buildCancelRescheduleLinks,
  buildCalendarLinks,
  saveIcsFile,
} from '../../../src/utils/emailUtils';
import { buildIcsFile } from '../../../src/utils/calendarLinks';
import { notifyOps } from '../../../src/utils/opsAlert';
import logger from '../../../src/utils/logger';

const futureDate = '2099-01-06';
const futureDateTwo = '2099-01-07';

describe('volunteerBookingController', () => {
  const poolQuery = mockPool.query as jest.Mock;
  const poolConnect = mockPool.connect as jest.Mock;
  const client = { query: jest.fn(), release: jest.fn() } as any;
  const randomUUIDMock = crypto.randomUUID as jest.Mock;
  const loggerMock = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    poolQuery.mockReset();
    poolConnect.mockReset();
    poolConnect.mockResolvedValue(client);
    client.query.mockReset();
    client.release.mockReset();
    (enqueueEmail as jest.Mock).mockClear();
    (sendTemplatedEmail as jest.Mock).mockClear();
    (buildCancelRescheduleLinks as jest.Mock).mockClear();
    (buildCalendarLinks as jest.Mock).mockClear();
    (saveIcsFile as jest.Mock).mockClear();
    (buildIcsFile as jest.Mock).mockClear();
    (notifyOps as jest.Mock).mockClear();
    (sendTemplatedEmail as jest.Mock).mockResolvedValue(undefined);
    randomUUIDMock.mockReset();
    randomUUIDMock.mockReturnValue('uuid-123');
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.debug.mockClear();
  });

  describe('createVolunteerBooking', () => {
    it('approves booking when capacity is available', async () => {
      const slotRow = {
        role_id: 3,
        max_volunteers: 5,
        start_time: '09:00:00',
        end_time: '12:00:00',
        category_name: 'Pantry',
        role_name: 'Greeter',
      };
      poolQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [slotRow] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ max_volunteers: slotRow.max_volunteers }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 44,
              slot_id: 10,
              volunteer_id: 5,
              date: futureDate,
              status: 'approved',
              reschedule_token: 'uuid-123',
              recurring_id: null,
              note: 'Excited',
            },
          ],
        })
        .mockResolvedValueOnce({});

      const req: any = {
        user: { id: 5, email: 'vol@example.com', name: 'Taylor' },
        body: { roleId: 10, date: futureDate, note: 'Excited' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await createVolunteerBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking automatically approved',
        status: 'approved',
        rescheduleToken: 'uuid-123',
        googleCalendarUrl: 'google-link',
        icsUrl: 'apple-link',
      });
      expect(enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'vol@example.com',
          templateId: 0,
          params: expect.objectContaining({
            cancelLink: 'cancel-link',
            rescheduleLink: 'reschedule-link',
            googleCalendarLink: 'google-link',
            appleCalendarLink: 'apple-link',
          }),
          attachments: [
            expect.objectContaining({
              name: 'shift.ics',
              content: Buffer.from('BEGIN:VCALENDAR', 'utf8').toString('base64'),
            }),
          ],
        }),
      );
      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FOR UPDATE'),
        [10],
      );
      expect(client.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('COUNT(*)'),
        [10, futureDate],
      );
      expect(client.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO volunteer_bookings'),
        [10, 5, futureDate, 'uuid-123', 'Excited'],
      );
      expect(client.query).toHaveBeenNthCalledWith(5, 'COMMIT');
      expect(client.release).toHaveBeenCalledTimes(1);
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Taylor (volunteer) booked'),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when role is already at capacity', async () => {
      poolQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              role_id: 3,
              max_volunteers: 1,
              start_time: '09:00:00',
              end_time: '12:00:00',
              category_name: 'Pantry',
              role_name: 'Greeter',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ max_volunteers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({});

      const req: any = {
        user: { id: 5, email: 'vol@example.com' },
        body: { roleId: 10, date: futureDate },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createVolunteerBooking(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Role is full' });
      expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
      expect(client.release).toHaveBeenCalled();
      expect(enqueueEmail).not.toHaveBeenCalled();
    });

    it('returns 404 when the volunteer slot cannot be found', async () => {
      poolQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const req: any = {
        user: { id: 5, email: 'vol@example.com' },
        body: { roleId: 10, date: futureDate },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createVolunteerBooking(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Role not found' });
      expect(poolConnect).not.toHaveBeenCalled();
    });

    it('prevents duplicate bookings for the same volunteer and shift', async () => {
      poolQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              role_id: 3,
              max_volunteers: 5,
              start_time: '09:00:00',
              end_time: '12:00:00',
              category_name: 'Pantry',
              role_name: 'Greeter',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99, status: 'approved' }] });

      const req: any = {
        user: { id: 5, email: 'vol@example.com' },
        body: { roleId: 10, date: futureDate },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createVolunteerBooking(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Already booked for this shift' });
      expect(poolConnect).not.toHaveBeenCalled();
    });
  });

  describe('createVolunteerBookingForVolunteer', () => {
    it('allows staff to force a booking when the slot is full', async () => {
      randomUUIDMock.mockReturnValue('forced-token');
      poolQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              role_id: 3,
              max_volunteers: 1,
              start_time: '09:00:00',
              end_time: '12:00:00',
              category_name: 'Pantry',
              role_name: 'Greeter',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ first_name: 'Jordan', last_name: 'Nguyen' }],
        });
      client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ max_volunteers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 77,
              slot_id: 10,
              volunteer_id: 42,
              date: futureDate,
              status: 'approved',
              reschedule_token: 'forced-token',
              recurring_id: null,
            },
          ],
        })
        .mockResolvedValueOnce({});

      const req: any = {
        body: { volunteerId: 42, roleId: 10, date: futureDate, force: true },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await createVolunteerBookingForVolunteer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking automatically approved',
        status: 'approved',
        rescheduleToken: 'forced-token',
        googleCalendarUrl: 'google-link',
        icsUrl: 'apple-link',
      });
      expect(client.query).toHaveBeenNthCalledWith(4, expect.stringContaining('UPDATE volunteer_slots'), [10]);
      expect(client.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('INSERT INTO volunteer_bookings'),
        [10, 42, futureDate, 'forced-token'],
      );
      expect(client.query).toHaveBeenNthCalledWith(6, 'COMMIT');
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Jordan Nguyen (volunteer) booked'),
      );
      expect(enqueueEmail).not.toHaveBeenCalled();
    });
  });

  describe('rescheduleVolunteerBooking', () => {
    it('reschedules a booking and queues the email notification', async () => {
      randomUUIDMock.mockReturnValue('new-token');
      poolQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 42,
              volunteer_id: 5,
              slot_id: 10,
              date: futureDate,
              status: 'approved',
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              role_id: 3,
              max_volunteers: 5,
              start_time: '13:00:00',
              end_time: '16:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
        .mockResolvedValueOnce({
          rows: [{ email: 'vol@example.com', first_name: 'Alex', last_name: 'Smith' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const req: any = {
        params: { token: 'token-1' },
        body: { roleId: 20, date: futureDateTwo },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await rescheduleVolunteerBooking(req, res, jest.fn());

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking rescheduled',
        status: 'approved',
        rescheduleToken: 'new-token',
      });
      expect(buildCalendarLinks).toHaveBeenCalledWith(
        futureDateTwo,
        '13:00:00',
        '16:00:00',
        'volunteer-booking-42@mjfb',
        1,
      );
      expect(saveIcsFile).toHaveBeenCalledWith(
        'volunteer-booking-42@mjfb-cancel.ics',
        'CANCEL_ICS_CONTENT',
      );
      expect(enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'vol@example.com',
          attachments: [
            expect.objectContaining({ name: 'shift.ics' }),
            expect.objectContaining({ name: 'shift-cancel.ics', content: Buffer.from('CANCEL_ICS_CONTENT', 'utf8').toString('base64') }),
          ],
          params: expect.objectContaining({
            appleCalendarCancelLink: 'cancel-ics-link',
            cancelLink: 'cancel-link',
            rescheduleLink: 'reschedule-link',
            newDate: expect.stringContaining('Jan 7, 2099'),
          }),
        }),
      );
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Alex Smith (volunteer) rescheduled shift'),
      );
    });

    it('rejects a reschedule when the target slot is full', async () => {
      poolQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            { id: 1, volunteer_id: 5, slot_id: 10, date: futureDate, status: 'approved' },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            { role_id: 3, max_volunteers: 1, start_time: '09:00:00', end_time: '12:00:00' },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const req: any = {
        params: { token: 'token-1' },
        body: { roleId: 20, date: futureDateTwo },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await rescheduleVolunteerBooking(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Role is full' });
    });
  });

  describe('cancelVolunteerBookingOccurrence', () => {
    const queueCancellationQueries = ({
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
        recurring_id: number | null;
        reschedule_token: string;
      }>;
      volunteer?: Partial<{
        email: string | null;
        first_name?: string | null;
        last_name?: string | null;
      }>;
      slot?: Partial<{ start_time: string; end_time: string }>;
    } = {}) => {
      const booking = {
        id: 55,
        slot_id: 10,
        volunteer_id: 5,
        date: futureDate,
        status: 'approved',
        recurring_id: null,
        reschedule_token: 'token-abc',
        ...bookingOverrides,
      };
      const volunteer = {
        email: 'vol@example.com',
        first_name: 'Alex',
        last_name: 'Kim',
        ...volunteerOverrides,
      };
      const slot = {
        start_time: '09:00:00',
        end_time: '12:00:00',
        ...slotOverrides,
      };
      poolQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [volunteer] })
        .mockResolvedValueOnce({ rows: [slot] });
      return { booking, volunteer, slot };
    };

    it('sends a cancellation email when staff cancel an upcoming shift', async () => {
      queueCancellationQueries();

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
      expect(buildCancelRescheduleLinks).toHaveBeenCalledWith('token-abc');
      expect(sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'vol@example.com',
          templateId: 0,
          params: expect.objectContaining({
            body: expect.stringContaining('Reason: sick'),
            cancelLink: 'cancel-link',
            rescheduleLink: 'reschedule-link',
          }),
        }),
      );
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Alex Kim (volunteer) cancelled shift'),
      );
    });

    it('skips email when the volunteer cancels their own booking', async () => {
      queueCancellationQueries();

      const req: any = {
        params: { id: '55' },
        body: {},
        user: { role: 'volunteer' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
      expect(buildCancelRescheduleLinks).not.toHaveBeenCalled();
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Alex Kim (volunteer) cancelled shift'),
      );
    });

    it('returns 400 when the booking is already cancelled', async () => {
      queueCancellationQueries({ booking: { status: 'cancelled' } });

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking already cancelled' });
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('returns 400 when the booking date is in the past', async () => {
      queueCancellationQueries({ booking: { date: '2000-01-01' } });

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking already occurred' });
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('formats Date instances returned from the database', async () => {
      queueCancellationQueries({
        booking: { date: new Date('2099-01-06T00:00:00-06:00') },
      });

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
      expect(sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.stringContaining('Jan 6, 2099'),
          }),
        }),
      );
      expect((notifyOps as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('Jan 6, 2099'),
      );
    });

    it('logs a warning when a staff user cancels for a volunteer without email', async () => {
      queueCancellationQueries({ volunteer: { email: null } });

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await cancelVolunteerBookingOccurrence(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Volunteer booking cancellation email not sent. Volunteer %s has no email.',
        5,
      );
    });

    it('logs and forwards errors when cancellation fails', async () => {
      const error = new Error('database offline');
      poolQuery.mockRejectedValueOnce(error);

      const req: any = {
        params: { id: '55' },
        body: { reason: 'sick' },
        user: { role: 'staff' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await cancelVolunteerBookingOccurrence(req, res, next);

      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error cancelling volunteer booking:',
        error,
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });
  });
});
