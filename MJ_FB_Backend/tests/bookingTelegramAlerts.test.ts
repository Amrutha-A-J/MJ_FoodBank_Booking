import { Request, Response, NextFunction } from 'express';

describe('booking telegram alerts', () => {
  let createBookingForUser: any;
  let notifyOps: jest.Mock;
  let pool: any;

  beforeEach(() => {
    jest.resetModules();
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
      insertBooking: jest.fn().mockResolvedValue(1),
      checkSlotCapacity: jest.fn().mockResolvedValue(undefined),
      lockClientRow: jest.fn().mockResolvedValue(undefined),
      SlotCapacityError: class extends Error {},
    }));
    jest.doMock('../src/db', () => ({
      __esModule: true,
      default: { query: jest.fn(), connect: jest.fn() },
    }));
    jest.doMock('../src/utils/opsAlert', () => ({
      __esModule: true,
      notifyOps: jest.fn(),
    }));
    createBookingForUser = require('../src/controllers/bookingController').createBookingForUser;
    notifyOps = require('../src/utils/opsAlert').notifyOps;
    pool = require('../src/db').default;
  });

  it('notifies via telegram when booking is created', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }],
      })
      .mockResolvedValueOnce({
        rows: [{ start_time: '09:00:00', end_time: '09:30:00' }],
      });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    expect(notifyOps).not.toHaveBeenCalled();

    await createBookingForUser(req, res, next);
    expect(notifyOps.mock.calls).toHaveLength(1);
    expect(notifyOps.mock.calls[0][0]).toContain(
      'booked Mon, Jan 15, 2024 at 9:00 AM',
    );
  });
});
