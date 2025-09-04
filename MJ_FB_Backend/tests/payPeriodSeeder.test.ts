import pool from '../src/db';
import { seedPayPeriods } from '../src/utils/payPeriodSeeder';

describe('seedPayPeriods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts 14-day pay periods between dates', async () => {
    const calls: any[] = [];
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      return { rowCount: 1 };
    });

    await seedPayPeriods('2024-08-03', '2024-09-13');

    expect(calls).toHaveLength(3);
    expect(calls[0].sql).toContain('ON CONFLICT DO NOTHING');
    expect(calls[0].params).toEqual(['2024-08-03', '2024-08-16']);
    expect(calls[1].params).toEqual(['2024-08-17', '2024-08-30']);
    expect(calls[2].params).toEqual(['2024-08-31', '2024-09-13']);
  });

  it('continues when pay period already exists', async () => {
    const calls: any[] = [];
    const results = [{ rowCount: 1 }, { rowCount: 0 }, { rowCount: 1 }];
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      return results.shift();
    });

    await seedPayPeriods('2024-08-03', '2024-09-13');

    expect(calls).toHaveLength(3);
  });
});
