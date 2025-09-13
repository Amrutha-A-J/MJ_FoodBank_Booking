import pool from '../src/db';
import './utils/mockDb';

const { refreshPantryWeekly } = jest.requireActual('../src/controllers/pantry/pantryAggregationController');

describe('refreshPantryWeekly', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockReset();
  });

  it('skips weeks starting outside the month', async () => {
    const year = new Date().getFullYear();
    await refreshPantryWeekly(year, 4, 6); // April has only 5 weeks
    expect(pool.query).not.toHaveBeenCalled();
  });
});
