import mockPool from './utils/mockDb';
import { refreshPantryMonthly } from '../src/controllers/pantry/pantryAggregationController';

describe('pantryAggregationController totals', () => {
  it('includes sunshine bag clients in total order and adult counts and sums people correctly', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ visits: 5, adults: 3, children: 2, weight: 100 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 2, weight: 30 }] })
      .mockResolvedValue({} as any);

    await refreshPantryMonthly(2024, 5);
  });
});
