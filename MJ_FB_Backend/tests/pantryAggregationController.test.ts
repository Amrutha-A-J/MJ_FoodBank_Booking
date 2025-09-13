jest.mock('../src/controllers/pantry/pantryAggregationController', () =>
  jest.requireActual('../src/controllers/pantry/pantryAggregationController'),
);

import mockPool from './utils/mockDb';
import {
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantry/pantryAggregationController';

const year = new Date().getFullYear();

describe('pantryAggregationController totals', () => {
  beforeEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it('sums weekly rows into monthly totals', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ orders: 3, adults: 5, children: 2, people: 7, weight: 40 }],
      })
      .mockResolvedValue({} as any);

    await refreshPantryMonthly(year, 5);

    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM pantry_weekly_overall'),
      [year, 5],
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO pantry_monthly_overall'),
      [year, 5, 3, 5, 2, 7, 40],
    );
  });

  it('sums weekly rows into yearly totals', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ orders: 10, adults: 20, children: 5, people: 25, weight: 100 }],
      })
      .mockResolvedValue({} as any);

    await refreshPantryYearly(year);

    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM pantry_weekly_overall'),
      [year],
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO pantry_yearly_overall'),
      [year, 10, 20, 5, 25, 100],
    );
  });
});

