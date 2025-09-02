import { Request, Response, NextFunction } from 'express';

describe('getBookingHistory includeVisitNotes', () => {
  let getBookingHistory: any;
  let fetchBookingHistory: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        fetchBookingHistory: jest
          .fn()
          .mockResolvedValue([{ id: 1, status: 'visited', slot_id: null, note: 'hello' }]),
      }));
      getBookingHistory = require('../src/controllers/bookingController').getBookingHistory;
      fetchBookingHistory = require('../src/models/bookingRepository').fetchBookingHistory;
    });
  });

  function makeReq(role: string, query: any = {}): Request {
    return { user: { id: '1', role, userId: '1' }, query } as unknown as Request;
  }

  it('forbids notes for non staff/agency', async () => {
    const req = makeReq('shopper', { includeVisitNotes: 'true' });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    await getBookingHistory(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(fetchBookingHistory).not.toHaveBeenCalled();
  });

  it('allows notes for staff', async () => {
    const req = makeReq('staff', { userId: '1', includeVisitNotes: 'true' });
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    await getBookingHistory(req, res, next);
    expect(fetchBookingHistory).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ note: 'hello' })]),
    );
  });
});
