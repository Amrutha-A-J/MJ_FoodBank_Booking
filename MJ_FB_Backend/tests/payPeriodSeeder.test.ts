import mockDb from './utils/mockDb';
import logger from '../src/utils/logger';
import { seedPayPeriods } from '../src/utils/payPeriodSeeder';

describe('seedPayPeriods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts 14-day pay periods between dates', async () => {
    (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

    await seedPayPeriods('2024-08-03', '2024-09-13');

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect((mockDb.query as jest.Mock).mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
    expect((mockDb.query as jest.Mock).mock.calls[0][1]).toEqual([
      '2024-08-03',
      '2024-08-16',
    ]);
    expect((mockDb.query as jest.Mock).mock.calls[1][1]).toEqual([
      '2024-08-17',
      '2024-08-30',
    ]);
    expect((mockDb.query as jest.Mock).mock.calls[2][1]).toEqual([
      '2024-08-31',
      '2024-09-13',
    ]);
  });

  it('skips duplicates when seeding the same range twice', async () => {
    const results = [
      { rowCount: 1 },
      { rowCount: 1 },
      { rowCount: 1 },
      { rowCount: 0 },
      { rowCount: 0 },
      { rowCount: 0 },
    ];
    (mockDb.query as jest.Mock).mockImplementation(() => results.shift());

    await seedPayPeriods('2024-08-03', '2024-09-13');
    await seedPayPeriods('2024-08-03', '2024-09-13');

    expect(mockDb.query).toHaveBeenCalledTimes(6);
    expect((mockDb.query as jest.Mock).mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
    expect((mockDb.query as jest.Mock).mock.calls[3][0]).toContain('ON CONFLICT DO NOTHING');
  });

  it('logs errors when queries fail', async () => {
    const error = new Error('db failure');
    (mockDb.query as jest.Mock).mockRejectedValue(error);

    await seedPayPeriods('2024-08-03', '2024-08-16');

    expect(logger.error).toHaveBeenCalledWith('Error seeding pay periods:', error);
  });

  it('handles cross-year boundaries', async () => {
    (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

    await seedPayPeriods('2024-12-28', '2025-01-24');

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect((mockDb.query as jest.Mock).mock.calls[0][1]).toEqual([
      '2024-12-28',
      '2025-01-10',
    ]);
    expect((mockDb.query as jest.Mock).mock.calls[1][1]).toEqual([
      '2025-01-11',
      '2025-01-24',
    ]);
  });
});
