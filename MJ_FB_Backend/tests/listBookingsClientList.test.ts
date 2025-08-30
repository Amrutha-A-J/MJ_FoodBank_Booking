import { Request, Response, NextFunction } from 'express';

describe('listBookings client list validation', () => {
  let listBookings: any;
  let getAgencyClientSet: jest.Mock;
  let repoFetchBookings: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/models/agency', () => ({
        __esModule: true,
        getAgencyClientSet: jest.fn(),
        isAgencyClient: jest.fn(),
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        fetchBookings: jest.fn(),
      }));
      listBookings = require('../src/controllers/bookingController').listBookings;
      getAgencyClientSet = require('../src/models/agency').getAgencyClientSet;
      repoFetchBookings = require('../src/models/bookingRepository').fetchBookings;
    });
  });

  it('allows agency to list bookings for associated clients', async () => {
    getAgencyClientSet.mockResolvedValue(new Set([1, 2]));
    repoFetchBookings.mockResolvedValue([{ id: 1 }]);
    const req = {
      user: { role: 'agency', id: 5 },
      query: { clientIds: '1,2' },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await listBookings(req, res, next);

    expect(getAgencyClientSet).toHaveBeenCalledWith(5, [1, 2]);
    expect(repoFetchBookings).toHaveBeenCalledWith(undefined, undefined, [1, 2]);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('rejects client lists containing unassociated clients', async () => {
    getAgencyClientSet.mockResolvedValue(new Set([1]));
    const req = {
      user: { role: 'agency', id: 5 },
      query: { clientIds: '1,2' },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await listBookings(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not associated with agency' });
    expect(repoFetchBookings).not.toHaveBeenCalled();
  });
});
