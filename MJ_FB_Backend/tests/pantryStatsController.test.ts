import mockDb from './utils/mockDb';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantryStatsController';

describe('pantryStatsController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockClear();
  });

  it('refreshPantryWeekly calls stored procedure', async () => {
    await refreshPantryWeekly(2024, 10);
    expect(mockDb.query).toHaveBeenCalledWith('SELECT refresh_pantry_weekly($1,$2)', [2024, 10]);
  });

  it('refreshPantryMonthly calls stored procedure', async () => {
    await refreshPantryMonthly(2024, 5);
    expect(mockDb.query).toHaveBeenCalledWith('SELECT refresh_pantry_monthly($1,$2)', [2024, 5]);
  });

  it('refreshPantryYearly calls stored procedure', async () => {
    await refreshPantryYearly(2024);
    expect(mockDb.query).toHaveBeenCalledWith('SELECT refresh_pantry_yearly($1)', [2024]);
  });
});
