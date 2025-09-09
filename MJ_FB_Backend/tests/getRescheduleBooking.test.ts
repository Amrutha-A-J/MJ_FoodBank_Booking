import { Request, Response, NextFunction } from 'express';
import { getRescheduleBooking } from '../src/controllers/bookingController';
import { fetchBookingByToken } from '../src/models/bookingRepository';

jest.mock('../src/models/bookingRepository');

const fetchBookingByTokenMock = fetchBookingByToken as jest.Mock;

describe('getRescheduleBooking', () => {
  beforeEach(() => {
    fetchBookingByTokenMock.mockReset();
  });

  it('returns no-show error for no_show bookings', async () => {
    fetchBookingByTokenMock.mockResolvedValue({ status: 'no_show' });
    const req = { params: { token: 'tok' } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getRescheduleBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message:
        'This booking has already expired and was marked as a no-show. Please book a new appointment.',
    });
  });

  it("returns can't reschedule for non-approved bookings", async () => {
    fetchBookingByTokenMock.mockResolvedValue({ status: 'cancelled' });
    const req = { params: { token: 'tok' } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getRescheduleBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "This booking can't be rescheduled" });
  });

  it('allows approved bookings', async () => {
    fetchBookingByTokenMock.mockResolvedValue({ status: 'approved' });
    const req = { params: { token: 'tok' } } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getRescheduleBooking(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ message: 'Booking can be rescheduled' });
  });
});
