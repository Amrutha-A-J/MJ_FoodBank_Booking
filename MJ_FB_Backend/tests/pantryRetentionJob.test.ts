import mockPool from './utils/mockDb';
import { cleanupOldPantryData } from '../src/utils/pantryRetentionJob';
import { refreshPantryMonthly, refreshPantryYearly } from '../src/controllers/pantry/pantryAggregationController';

jest.mock('../src/controllers/pantry/pantryAggregationController');

describe('cleanupOldPantryData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes previous year and deletes old records', async () => {
    const nextYear = new Date().getFullYear() + 1;
    jest.useFakeTimers().setSystemTime(new Date(`${nextYear}-08-15`));

    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

    await cleanupOldPantryData();

    const previousYear = nextYear - 1;
    for (let month = 1; month <= 12; month++) {
      expect(refreshPantryMonthly).toHaveBeenCalledWith(previousYear, month);
    }
    expect(refreshPantryMonthly).toHaveBeenCalledTimes(12);
    expect(refreshPantryYearly).toHaveBeenCalledWith(previousYear);

    const cutoff = `${nextYear}-01-01`;
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

