import { Request, Response, NextFunction } from 'express';
import { rescheduleBooking } from '../src/controllers/bookingController';
import { enqueueEmail } from '../src/utils/emailQueue';
import pool from '../src/db';
import {
  fetchBookingByToken,
  updateBooking,
  checkSlotCapacity,
} from '../src/models/bookingRepository';
import {
  isDateWithinCurrentOrNextMonth,
  countVisitsAndBookingsForMonth,
} from '../src/utils/bookingUtils';

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));
jest.mock('../src/utils/emailUtils', () => ({
  buildCancelRescheduleLinks: () => ({ cancelLink: '#cancel', rescheduleLink: '#resched' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '#google',
    outlookCalendarLink: '#outlook',
    appleCalendarLink: '#apple',
  }),
}));
jest.mock('../src/models/bookingRepository');
jest.mock('../src/utils/bookingUtils');
jest.mock('../src/config', () => ({
  __esModule: true,
  default: {
    clientRescheduleTemplateId: 10,
    bookingConfirmationTemplateId: 20,
  },
}));
jest.mock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const enqueueEmailMock = enqueueEmail as jest.Mock;
const fetchBookingByTokenMock = fetchBookingByToken as jest.Mock;
const updateBookingMock = updateBooking as jest.Mock;
const poolQueryMock = (pool as any).query as jest.Mock;

(countVisitsAndBookingsForMonth as jest.Mock).mockResolvedValue(0);
(isDateWithinCurrentOrNextMonth as jest.Mock).mockReturnValue(true);
(checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
(updateBooking as jest.Mock).mockResolvedValue(undefined);

fetchBookingByTokenMock.mockResolvedValue({
  id: 1,
  user_id: 2,
  slot_id: 5,
  date: '2025-01-01',
  status: 'approved',
});

poolQueryMock
  .mockResolvedValueOnce({ rows: [{ start_time: '09:00', end_time: '10:00' }] })
  .mockResolvedValueOnce({ rows: [{ start_time: '11:00', end_time: '12:00' }] })
  .mockResolvedValueOnce({ rows: [{ email: 'client@example.com' }] });

describe('rescheduleBooking', () => {
  it('queues a reschedule email with old and new times', async () => {
    const req = {
      params: { token: 'tok' },
      body: { slotId: 6, date: '2025-01-05' },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await rescheduleBooking(req, res, next);

    expect(updateBookingMock).toHaveBeenCalled();
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock.mock.calls[0][0].to).toBe('client@example.com');
    const params = enqueueEmailMock.mock.calls[0][0].params;
    expect(params.oldDate).toBe('Wed, Jan 1, 2025');
      expect(params.oldTime).toBe('9:00 AM to 10:00 AM');
      expect(params.newDate).toBe('Sun, Jan 5, 2025');
      expect(params.newTime).toBe('11:00 AM to 12:00 PM');
    expect(params.cancelLink).toBe('#cancel');
    expect(params.rescheduleLink).toBe('#resched');
    expect(params.googleCalendarLink).toBe('#google');
    expect(params.outlookCalendarLink).toBe('#outlook');
    expect(params.appleCalendarLink).toBe('#apple');
    expect(params.appleCalendarCancelLink).toContain('METHOD%3ACANCEL');
  });
});
