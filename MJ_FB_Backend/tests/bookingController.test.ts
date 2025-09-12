import { Request, Response, NextFunction } from 'express';
import { formatReginaDate } from '../src/utils/dateUtils';

describe('createBookingForUser', () => {
  let createBookingForUser: any;
  let enqueueEmail: jest.Mock;
  let pool: any;
  let checkSlotCapacity: jest.Mock;
  let insertBooking: jest.Mock;
  let bookingUtils: any;

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
        lockClientRow: jest.fn().mockResolvedValue(undefined),
        SlotCapacityError: class extends Error {},
      }));
      jest.doMock('../src/models/agency', () => ({
        __esModule: true,
        isAgencyClient: jest.fn().mockResolvedValue(true),
        getAgencyClientSet: jest.fn(),
      }));
      jest.doMock('../src/utils/dbUtils', () => ({
        __esModule: true,
        hasTable: jest.fn().mockResolvedValue(true),
      }));
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn(), connect: jest.fn() },
      }));
      createBookingForUser = require('../src/controllers/bookingController').createBookingForUser;
      enqueueEmail = require('../src/utils/emailQueue').enqueueEmail;
      pool = require('../src/db').default;
      checkSlotCapacity = require('../src/models/bookingRepository').checkSlotCapacity;
      insertBooking = require('../src/models/bookingRepository').insertBooking;
      bookingUtils = require('../src/utils/bookingUtils');
    });
  });

  it('enqueues confirmation email after booking creation', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '09:30:00' }] });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        templateId: expect.any(Number),
        params: expect.objectContaining({
            body: expect.stringContaining('Mon, Jan 15, 2024 from 9:00 AM to 9:30 AM'),
          googleCalendarLink: expect.any(String),
          appleCalendarLink: expect.any(String),
        }),
      }),
    );
  });

  it('returns 400 if booking date is a holiday', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // select client for update
      .mockResolvedValueOnce({ rowCount: 1 }) // holiday
      .mockResolvedValue({}); // ROLLBACK
    const client = { query, release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-12-25' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Pantry is closed on the selected date.',
    });
    expect(checkSlotCapacity).not.toHaveBeenCalled();
  });

  it('passes note to insertBooking', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '09:30:00' }] });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2024-01-15', note: 'bring ID' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(insertBooking).toHaveBeenCalledWith(
      1,
      2,
      'approved',
      '',
      '2024-01-15',
      false,
      expect.any(String),
      null,
      'bring ID',
      expect.any(Object),
    );
  });

  it('allows staff to book outside allowed months', async () => {
    (bookingUtils.isDateWithinCurrentOrNextMonth as jest.Mock).mockReturnValue(false);
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }],
      })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '09:30:00' }] });
    const req = {
      user: { role: 'staff', id: 99 },
      body: { userId: 1, slotId: 2, date: '2030-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertBooking).toHaveBeenCalled();
  });

  it('rejects agency bookings outside allowed months', async () => {
    (bookingUtils.isDateWithinCurrentOrNextMonth as jest.Mock).mockReturnValue(false);
    const req = {
      user: { role: 'agency', id: 77 },
      body: { userId: 1, slotId: 2, date: '2030-01-15' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBookingForUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Please choose a valid date' });
    expect(insertBooking).not.toHaveBeenCalled();
  });
});

describe('createBooking', () => {
  let createBooking: any;
  let pool: any;
  let checkSlotCapacity: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));
      jest.doMock('../src/utils/bookingUtils', () => ({
        __esModule: true,
        isDateWithinCurrentOrNextMonth: jest
          .fn()
          .mockReturnValue(true),
        countVisitsAndBookingsForMonth: jest
          .fn()
          .mockResolvedValue(0),
        findUpcomingBooking: jest.fn().mockResolvedValue(null),
        LIMIT_MESSAGE: 'limit',
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        insertBooking: jest.fn(),
        checkSlotCapacity: jest.fn(),
      }));
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { connect: jest.fn() },
      }));
      createBooking = require('../src/controllers/bookingController').createBooking;
      pool = require('../src/db').default;
      checkSlotCapacity = require('../src/models/bookingRepository').checkSlotCapacity;
    });
  });

  it('returns 400 when booking date is a holiday', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    (client.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('holidays')) return Promise.resolve({ rowCount: 1 });
      return Promise.resolve({ rows: [] });
    });
    const req = {
      user: { id: 1, userId: 1, email: 'user@example.com' },
      body: { slotId: 1, date: '2024-12-25' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Pantry is closed on the selected date.',
    });
    expect(checkSlotCapacity).not.toHaveBeenCalled();
  });
});

describe('cancelBooking', () => {
  let cancelBooking: any;
  let enqueueEmail: jest.Mock;
  let fetchBookingById: jest.Mock;
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
        fetchBookingById: jest.fn(),
        updateBooking: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn() },
      }));
      cancelBooking = require('../src/controllers/bookingController').cancelBooking;
      enqueueEmail = require('../src/utils/emailQueue').enqueueEmail;
      fetchBookingById = require('../src/models/bookingRepository').fetchBookingById;
      updateBooking = require('../src/models/bookingRepository').updateBooking;
      pool = require('../src/db').default;
    });
  });

  it('updates booking status when staff provides reason', async () => {
    const futureDate = formatReginaDate(new Date(Date.now() + 86400000));
    (fetchBookingById as jest.Mock).mockResolvedValue({
      id: 1,
      user_id: '2',
      slot_id: 1,
      status: 'approved',
      date: futureDate,
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00' }] });
    const req = {
      params: { id: '1' },
      user: { role: 'staff', id: '99' },
      body: { reason: 'scheduling conflict', type: 'Shopping Appointment' },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await cancelBooking(req, res, next);

    expect(updateBooking).toHaveBeenCalledWith(1, { status: 'cancelled', request_data: 'scheduling conflict' });
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
  });

  it('does not send email when non-staff cancels', async () => {
    const futureDate = formatReginaDate(new Date(Date.now() + 86400000));
    (fetchBookingById as jest.Mock).mockResolvedValue({
      id: 1,
      user_id: '5',
      status: 'approved',
      date: futureDate,
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ email: 'client@example.com', first_name: 'A', last_name: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00' }] });
    const req = {
      params: { id: '1' },
      user: { role: 'client', id: '5' },
      body: {},
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await cancelBooking(req, res, next);

    expect(updateBooking).toHaveBeenCalledWith(1, { status: 'cancelled', request_data: 'user cancelled' });
    expect(enqueueEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
  });
});

describe('markBookingNoShow', () => {
  let markBookingNoShow: any;
  let enqueueEmail: jest.Mock;
  let updateBooking: jest.Mock;

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
      markBookingNoShow = require('../src/controllers/bookingController').markBookingNoShow;
      enqueueEmail = require('../src/utils/emailQueue').enqueueEmail;
      updateBooking = require('../src/models/bookingRepository').updateBooking;
    });
  });

  it('does not queue a reschedule email', async () => {
    const req = { params: { id: '1' }, body: {} } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await markBookingNoShow(req, res, next);

    expect(updateBooking).toHaveBeenCalledWith(1, { status: 'no_show', request_data: '', note: null });
    expect(enqueueEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking marked as no-show' });
  });
});

describe('markBookingVisited', () => {
  let markBookingVisited: any;
  let pool: any;
  let updateBooking: jest.Mock;
  let refreshClientVisitCount: jest.Mock;
  let getCartTare: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn() },
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        updateBooking: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/controllers/clientVisitController', () => ({
        __esModule: true,
        refreshClientVisitCount: jest.fn(),
      }));
      jest.doMock('../src/utils/configCache', () => ({
        __esModule: true,
        getCartTare: jest.fn().mockResolvedValue(5),
      }));
      markBookingVisited = require('../src/controllers/bookingController').markBookingVisited;
      pool = require('../src/db').default;
      updateBooking = require('../src/models/bookingRepository').updateBooking;
      refreshClientVisitCount = require('../src/controllers/clientVisitController').refreshClientVisitCount;
      getCartTare = require('../src/utils/configCache').getCartTare;
    });
  });

  it('computes missing weightWithoutCart from weightWithCart', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ client_id: 1 }] });
    const req = { params: { id: '123' }, body: { weightWithCart: 15 } } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await markBookingVisited(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      [15, 10, 0, null, 0, 0, 123],
    );
    expect(getCartTare).toHaveBeenCalled();
  });

  it('computes missing weightWithCart from weightWithoutCart', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ client_id: 1 }] });
    const req = { params: { id: '123' }, body: { weightWithoutCart: 10 } } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await markBookingVisited(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      [15, 10, 0, null, 0, 0, 123],
    );
    expect(getCartTare).toHaveBeenCalled();
  });

  describe('validation', () => {
    it.each([
      ['weightWithCart'],
      ['weightWithoutCart'],
      ['petItem'],
      ['adults'],
      ['children'],
    ])('returns 400 for negative %s', async (field) => {
      const req = { params: { id: '123' }, body: { [field]: -1 } } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await markBookingVisited(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: `${field} must be a non-negative number` });
      expect(pool.query).not.toHaveBeenCalled();
      expect(updateBooking).not.toHaveBeenCalled();
    });

    it.each([
      ['weightWithCart'],
      ['weightWithoutCart'],
      ['petItem'],
      ['adults'],
      ['children'],
    ])('returns 400 for non-numeric %s', async (field) => {
      const req = { params: { id: '123' }, body: { [field]: 'abc' } } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await markBookingVisited(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: `${field} must be a non-negative number` });
      expect(pool.query).not.toHaveBeenCalled();
      expect(updateBooking).not.toHaveBeenCalled();
    });
  });
});
