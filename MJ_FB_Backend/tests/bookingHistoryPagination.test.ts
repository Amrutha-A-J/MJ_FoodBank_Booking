import { Request, Response, NextFunction } from 'express';

describe('getBookingHistory pagination', () => {
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
        fetchBookingHistory: jest.fn().mockResolvedValue([]),
      }));
      getBookingHistory = require('../src/controllers/bookingController').getBookingHistory;
      fetchBookingHistory = require('../src/models/bookingRepository').fetchBookingHistory;
    });
  });

  function baseReq(query: any = {}): Request {
    return {
      user: { id: '1', role: 'volunteer', userId: '1' },
      query,
    } as unknown as Request;
  }

  it('accepts numeric limit and offset', async () => {
    const req = baseReq({ limit: '5', offset: '10' });
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(fetchBookingHistory).toHaveBeenCalledWith([1], false, undefined, false, 5, 10);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 400 for invalid limit', async () => {
    const req = baseReq({ limit: 'foo' });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid limit' });
    expect(fetchBookingHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid offset', async () => {
    const req = baseReq({ offset: 'bar' });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getBookingHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid offset' });
    expect(fetchBookingHistory).not.toHaveBeenCalled();
  });
});
