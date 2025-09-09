import { Request, Response, NextFunction } from 'express';

describe('booking cancel telegram alert', () => {
  let cancelBooking: any;
  let fetchBookingById: jest.Mock;
  let updateBooking: jest.Mock;
  let pool: any;
  let notifyOps: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({ __esModule: true, enqueueEmail: jest.fn() }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        fetchBookingById: jest.fn(),
        updateBooking: jest.fn().mockResolvedValue(undefined),
      }));
      jest.doMock('../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
      cancelBooking = require('../src/controllers/bookingController').cancelBooking;
      fetchBookingById = require('../src/models/bookingRepository').fetchBookingById;
      updateBooking = require('../src/models/bookingRepository').updateBooking;
      pool = require('../src/db').default;
      notifyOps = require('../src/utils/opsAlert').notifyOps;
    });
  });

  it('notifies via telegram when booking is cancelled', async () => {
    const futureDate = '2030-01-01';
    fetchBookingById.mockResolvedValue({ id: 1, user_id: '2', slot_id: 5, status: 'approved', date: futureDate });
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

    expect(notifyOps).toHaveBeenCalledWith(
      expect.stringContaining('cancelled booking for Tue, Jan 1, 2030 at 9:00 AM'),
    );
  });
});
