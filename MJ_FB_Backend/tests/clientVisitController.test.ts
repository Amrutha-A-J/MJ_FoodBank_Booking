import mockDb from './utils/mockDb';
import { getWeekForDate } from '../src/utils/dateUtils';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantryStatsController';
import { deleteVisit } from '../src/controllers/clientVisitController';

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
    expect(refreshPantryWeekly).toHaveBeenCalledWith(year, week);
    expect(refreshPantryMonthly).toHaveBeenCalledWith(year, month);
    expect(refreshPantryYearly).toHaveBeenCalledWith(year);
  });
});
