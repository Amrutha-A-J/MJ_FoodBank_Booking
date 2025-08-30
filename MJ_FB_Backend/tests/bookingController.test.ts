import { Request, Response, NextFunction } from 'express';

describe('createBookingForUser', () => {
  let createBookingForUser: any;
  let enqueueEmail: jest.Mock;
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
      enqueueEmail = require('../src/utils/emailQueue').enqueueEmail;
      pool = require('../src/db').default;
    });
  });

  it('enqueues confirmation email after booking creation', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ email: 'client@example.com' }] });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(enqueueEmail).toHaveBeenCalledWith(
      'client@example.com',
      'Booking approved',
      expect.stringContaining('2024-01-15'),
    );
  });
});

describe('markBookingNoShow', () => {
  let markBookingNoShow: any;
  let enqueueEmail: jest.Mock;
  let updateBooking: jest.Mock;
  let pool: any;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        updateBooking: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn() },
      }));
      markBookingNoShow = require('../src/controllers/bookingController').markBookingNoShow;
      enqueueEmail = require('../src/utils/emailQueue').enqueueEmail;
      updateBooking = require('../src/models/bookingRepository').updateBooking;
      pool = require('../src/db').default;
    });
  });

  it('queues a reschedule email', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { email: 'client@example.com', reschedule_token: 'tok', date: '2024-01-01' },
      ],
    });
    const req = { params: { id: '1' }, body: {} } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await markBookingNoShow(req, res, next);

    expect(updateBooking).toHaveBeenCalledWith(1, { status: 'no_show', request_data: '' });
    expect(enqueueEmail).toHaveBeenCalledWith(
      'client@example.com',
      'Booking marked as no-show',
      expect.stringContaining('http://localhost:3000/reschedule/tok'),
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking marked as no-show' });
  });
});
