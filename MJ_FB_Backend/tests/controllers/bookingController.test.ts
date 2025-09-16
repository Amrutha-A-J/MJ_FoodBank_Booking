import { Request, Response, NextFunction } from 'express';

describe('getBookingHistory validation edge cases', () => {
  let getBookingHistory: any;
  let fetchBookingHistoryMock: jest.Mock;
  let isAgencyClientMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      fetchBookingHistoryMock = jest.fn().mockResolvedValue([]);
      jest.doMock('../../src/models/bookingRepository', () => ({
        __esModule: true,
        fetchBookingHistory: fetchBookingHistoryMock,
      }));

      isAgencyClientMock = jest.fn();
      jest.doMock('../../src/models/agency', () => ({
        __esModule: true,
        isAgencyClient: isAgencyClientMock,
        getAgencyClientSet: jest.fn(),
      }));

      getBookingHistory = require('../../src/controllers/bookingController').getBookingHistory;
    });
  });

  it('returns 401 when requester is missing', async () => {
    const req = { query: {} } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(fetchBookingHistoryMock).not.toHaveBeenCalled();
  });

  it('requires userId for staff users', async () => {
    const req = {
      user: { role: 'staff', id: '10' },
      query: {},
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'userId query parameter required' });
    expect(fetchBookingHistoryMock).not.toHaveBeenCalled();
  });

  it('rejects agency requests with unassociated clientIds', async () => {
    isAgencyClientMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const req = {
      user: { role: 'agency', id: '55' },
      query: { clientIds: '1,2' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(isAgencyClientMock).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not associated with agency' });
    expect(fetchBookingHistoryMock).not.toHaveBeenCalled();
  });

  it('returns 400 when requester id is invalid for clients', async () => {
    const req = {
      user: { role: 'client', id: 'abc' },
      query: {},
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user' });
    expect(fetchBookingHistoryMock).not.toHaveBeenCalled();
  });

  it('strips staff notes when requester cannot view them', async () => {
    fetchBookingHistoryMock.mockResolvedValueOnce([
      { id: 1, note: 'visible', staff_note: 'hidden' },
    ]);

    const req = {
      user: { role: 'client', id: '42' },
      query: {},
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(fetchBookingHistoryMock).toHaveBeenCalledWith([42], false, undefined, false, undefined, undefined);
    expect(json).toHaveBeenCalledTimes(1);
    const payload = (json.mock.calls[0] as [any])[0];
    expect(payload).toEqual([{ id: 1, note: 'visible' }]);
  });
});

describe('rescheduleBooking validation', () => {
  let rescheduleBooking: any;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../../src/db', () => ({
        __esModule: true,
        default: { connect: jest.fn() },
      }));
      rescheduleBooking = require('../../src/controllers/bookingController').rescheduleBooking;
    });
  });

  it('returns 400 when slotId is missing', async () => {
    const req = {
      params: { token: 'abc' },
      body: { date: '2099-01-01' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await rescheduleBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Please select a time slot and date' });
  });
});

describe('createBooking error handling', () => {
  let createBooking: any;
  let pool: any;
  let insertBookingMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      insertBookingMock = jest.fn();
      const checkSlotCapacityMock = jest.fn().mockResolvedValue(undefined);
      const lockClientRowMock = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../../src/utils/bookingUtils', () => ({
        __esModule: true,
        isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
        countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
        findUpcomingBooking: jest.fn().mockResolvedValue(null),
        LIMIT_MESSAGE: 'limit message',
      }));

      jest.doMock('../../src/utils/holidayCache', () => ({
        __esModule: true,
        isHoliday: jest.fn().mockResolvedValue(false),
      }));

      jest.doMock('../../src/models/bookingRepository', () => ({
        __esModule: true,
        SlotCapacityError: class extends Error {
          status = 400;
        },
        checkSlotCapacity: checkSlotCapacityMock,
        insertBooking: insertBookingMock,
        lockClientRow: lockClientRowMock,
        fetchBookings: jest.fn(),
        fetchBookingById: jest.fn(),
        updateBooking: jest.fn(),
        fetchBookingByToken: jest.fn(),
        fetchBookingHistory: jest.fn(),
        insertWalkinUser: jest.fn(),
      }));

      jest.doMock('../../src/models/agency', () => ({
        __esModule: true,
        isAgencyClient: jest.fn(),
        getAgencyClientSet: jest.fn(),
      }));

      jest.doMock('../../src/controllers/clientVisitController', () => ({
        __esModule: true,
        refreshClientVisitCount: jest.fn(),
        getClientBookingsThisMonth: jest.fn().mockResolvedValue(0),
      }));

      jest.doMock('../../src/utils/dbUtils', () => ({
        __esModule: true,
        hasTable: jest.fn().mockResolvedValue(true),
      }));

      jest.doMock('../../src/utils/configCache', () => ({
        __esModule: true,
        getCartTare: jest.fn().mockResolvedValue(0),
      }));

      jest.doMock('../../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));

      jest.doMock('../../src/utils/emailUtils', () => ({
        __esModule: true,
        buildCancelRescheduleLinks: jest.fn().mockReturnValue({
          cancelLink: 'cancel',
          rescheduleLink: 'reschedule',
        }),
        buildCalendarLinks: jest.fn().mockReturnValue({
          googleCalendarLink: 'google',
          appleCalendarLink: 'apple',
          icsContent: 'ics',
        }),
        saveIcsFile: jest.fn(),
      }));

      jest.doMock('../../src/utils/calendarLinks', () => ({
        __esModule: true,
        buildIcsFile: jest.fn().mockReturnValue('ics'),
      }));

      jest.doMock('../../src/utils/opsAlert', () => ({
        __esModule: true,
        notifyOps: jest.fn(),
      }));

      jest.doMock('../../src/db', () => ({
        __esModule: true,
        default: { connect: jest.fn(), query: jest.fn() },
      }));

      createBooking = require('../../src/controllers/bookingController').createBooking;
      pool = require('../../src/db').default;
    });
  });

  it('propagates insert errors to the error handler', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(client);

    const req = {
      user: { id: '7', userId: '7', email: 'user@example.com', name: 'Client' },
      body: { slotId: 5, date: '2099-05-01' },
    } as unknown as Request;
    const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error('insert failed');
    insertBookingMock.mockRejectedValueOnce(error);

    await createBooking(req, res, next);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(insertBookingMock).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
