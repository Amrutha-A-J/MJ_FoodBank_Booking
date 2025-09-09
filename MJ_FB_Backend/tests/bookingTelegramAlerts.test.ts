import { Request, Response, NextFunction } from 'express';

describe('booking telegram alerts', () => {
  let createBookingForUser: any;
  let notifyOps: jest.Mock;
  let pool: any;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));
      jest.doMock('../src/utils/bookingUtils', () => ({
        __esModule: true,
        isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
        countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
        findUpcomingBooking: jest.fn().mockResolvedValue(null),
        LIMIT_MESSAGE: 'limit',
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        insertBooking: jest.fn().mockResolvedValue(undefined),
        checkSlotCapacity: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn(), connect: jest.fn() },
      }));
      createBookingForUser = require('../src/controllers/bookingController').createBookingForUser;
      notifyOps = require('../src/utils/opsAlert').notifyOps;
      pool = require('../src/db').default;
    });
  });

  it('notifies via telegram when booking is created', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '09:30:00' }] });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(notifyOps).toHaveBeenCalledWith(
      expect.stringContaining('booked Mon, Jan 15, 2024 at 9:00 AM'),
    );
  });
});
