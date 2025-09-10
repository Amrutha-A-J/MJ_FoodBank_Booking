import mockDb from './utils/mockDb';
import { getWeekForDate } from '../src/utils/dateUtils';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantryStatsController';
import { deleteVisit, toggleVisitVerification } from '../src/controllers/clientVisitController';

jest.mock('../src/controllers/pantryStatsController', () => ({
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
}));

jest.mock('../src/models/bookingRepository', () => ({
  updateBooking: jest.fn(),
}));

describe('clientVisitController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (refreshPantryWeekly as jest.Mock).mockReset();
    (refreshPantryMonthly as jest.Mock).mockReset();
    (refreshPantryYearly as jest.Mock).mockReset();
  });

  it('deleteVisit triggers pantry refresh', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 1, date: '2024-05-20' }] }) // select existing
      .mockResolvedValueOnce({}) // delete
      .mockResolvedValueOnce({}) // refreshClientVisitCount
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // booking query

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await deleteVisit(req, res, next);
    const { week, month, year } = getWeekForDate('2024-05-20');
    expect(refreshPantryWeekly).toHaveBeenCalledWith(year, month, week);
    expect(refreshPantryMonthly).toHaveBeenCalledWith(year, month);
    expect(refreshPantryYearly).toHaveBeenCalledWith(year);
  });

  it('toggles visit verification', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            clientId: 1,
            weightWithCart: 0,
            weightWithoutCart: 0,
            petItem: 0,
            anonymous: false,
            note: null,
            adults: 0,
            children: 0,
            verified: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            clientId: 1,
            weightWithCart: 0,
            weightWithoutCart: 0,
            petItem: 0,
            anonymous: false,
            note: null,
            adults: 0,
            children: 0,
            verified: false,
          },
        ],
      });

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await toggleVisitVerification(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true }),
    );

    await toggleVisitVerification(req, res, next);
    expect(res.json).toHaveBeenLastCalledWith(
      expect.objectContaining({ verified: false }),
    );
  });
});
