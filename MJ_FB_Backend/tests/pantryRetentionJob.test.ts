import mockPool from './utils/mockDb';
import { cleanupOldPantryData } from '../src/utils/pantryRetentionJob';
import { refreshPantryMonthly, refreshPantryYearly } from '../src/controllers/pantryAggregationController';

jest.mock('../src/controllers/pantryAggregationController');

describe('cleanupOldPantryData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes previous year and deletes old records', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-08-15'));

    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

    await cleanupOldPantryData();

    for (let month = 1; month <= 12; month++) {
      expect(refreshPantryMonthly).toHaveBeenCalledWith(2024, month);
    }
    expect(refreshPantryMonthly).toHaveBeenCalledTimes(12);
    expect(refreshPantryYearly).toHaveBeenCalledWith(2024);

    const cutoff = '2025-01-01';
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM client_visits WHERE date < $1',
      [cutoff],
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      3,
      'DELETE FROM bookings WHERE date < $1',
      [cutoff],
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
  });
});

