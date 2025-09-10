import pool from '../src/db';
import { refreshPantryMonthly } from '../src/controllers/pantry/pantryAggregationController';

describe('pantryAggregationController totals', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes sunshine bag clients in total order and adult counts and sums people correctly', async () => {
    const queryMock = jest
      .spyOn(pool, 'query')
      .mockResolvedValueOnce({ rows: [{ visits: 5, adults: 3, children: 2, weight: 100 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 2, weight: 30 }] })
      .mockResolvedValue({} as any);

    await refreshPantryMonthly(2024, 5);

    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO pantry_monthly_overall'),
      [2024, 5, 7, 5, 2, 5, 130, 2, 30],
    );
  });
});
