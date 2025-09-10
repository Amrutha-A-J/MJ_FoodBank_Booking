import mockDb from './utils/mockDb';
import { refreshPantryMonthly } from '../src/controllers/pantry/pantryAggregationController';

describe('pantryAggregationController totals', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('includes sunshine bag clients in total client and adult counts', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ visits: 5, adults: 3, children: 2, weight: 100 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 2, weight: 30 }] })
      .mockResolvedValueOnce({});

    await refreshPantryMonthly(2024, 5);

    expect(mockDb.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO pantry_monthly_overall'),
      [2024, 5, 7, 5, 2, 7, 130, 2, 30],
    );
  });
});
