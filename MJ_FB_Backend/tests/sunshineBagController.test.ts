import mockDb from './utils/mockDb';
import { getWeekForDate } from '../src/utils/dateUtils';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantryStatsController';
import { upsertSunshineBag } from '../src/controllers/sunshineBagController';

jest.mock('../src/controllers/pantryStatsController', () => ({
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
}));

describe('sunshineBagController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (refreshPantryWeekly as jest.Mock).mockReset();
    (refreshPantryMonthly as jest.Mock).mockReset();
    (refreshPantryYearly as jest.Mock).mockReset();
  });

  it('upsertSunshineBag triggers pantry refresh', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ date: '2024-05-20', weight: 10, client_count: 2 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ weight: 10, client_count: 2 }], rowCount: 1 })
      .mockResolvedValueOnce({});

    const req = { body: { date: '2024-05-20', weight: 10, clientCount: 2 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    await upsertSunshineBag(req, res, next);
    const { week, month, year } = getWeekForDate('2024-05-20');
    expect(refreshPantryWeekly).toHaveBeenCalledWith(year, month, week);
    expect(refreshPantryMonthly).toHaveBeenCalledWith(year, month);
    expect(refreshPantryYearly).toHaveBeenCalledWith(year);
  });
});
