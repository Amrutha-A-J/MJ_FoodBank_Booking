import { Request, Response, NextFunction } from 'express';

describe('booking notification failures', () => {
  let createBookingForUser: any;
  let cancelBooking: any;
  let pool: any;
  let notifyOps: jest.Mock;
  let sendBookingEvent: jest.Mock;
  let logger: { error: jest.Mock };
  let fetchBookingById: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({ __esModule: true, enqueueEmail: jest.fn() }));
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
        SlotCapacityError: class extends Error {},
        fetchBookingById: jest.fn(),
        updateBooking: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/db', () => ({ __esModule: true, default: { query: jest.fn(), connect: jest.fn() } }));
      jest.doMock('../src/utils/opsAlert', () => ({
        __esModule: true,
        notifyOps: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      jest.doMock('../src/utils/bookingEvents', () => ({
        __esModule: true,
        sendBookingEvent: jest.fn().mockImplementation(() => {
          throw new Error('event fail');
        }),
      }));
      jest.doMock('../src/utils/logger', () => ({
        __esModule: true,
        default: { error: jest.fn(), warn: jest.fn() },
      }));
      createBookingForUser = require('../src/controllers/bookingController').createBookingForUser;
      cancelBooking = require('../src/controllers/bookingController').cancelBooking;
      pool = require('../src/db').default;
      notifyOps = require('../src/utils/opsAlert').notifyOps;
      sendBookingEvent = require('../src/utils/bookingEvents').sendBookingEvent;
      logger = require('../src/utils/logger').default;
      fetchBookingById = require('../src/models/bookingRepository').fetchBookingById;
    });
  });

  it('createBookingForUser succeeds when notifications fail', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '09:30:00' }] });
    const req = { user: { role: 'staff', id: 99 }, body: { userId: 1, slotId: 2, date: '2024-01-15' } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Booking created for user' }));
    expect(sendBookingEvent).toHaveBeenCalled();
    expect(notifyOps).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Failed to send booking event', expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith('Failed to notify ops', expect.any(Error));
  });

  it('cancelBooking succeeds when notifications fail', async () => {
    const futureDate = '2030-01-01';
    fetchBookingById.mockResolvedValue({ id: 1, user_id: '2', slot_id: 5, status: 'approved', date: futureDate });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00' }] });
    const req = { params: { id: '1' }, user: { role: 'staff', id: '99' }, body: {} } as unknown as Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await cancelBooking(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
    expect(sendBookingEvent).toHaveBeenCalled();
    expect(notifyOps).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Failed to send booking event', expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith('Failed to notify ops', expect.any(Error));
  });
});
