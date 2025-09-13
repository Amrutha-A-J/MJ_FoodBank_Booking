import mockPool from './utils/mockDb';
import { cleanupOldLogs } from '../src/utils/logCleanupJob';
import { refreshWarehouseOverall } from '../src/controllers/warehouse/warehouseOverallController';
import { refreshSunshineBagOverall } from '../src/controllers/sunshineBagController';

jest.mock('../src/controllers/warehouse/warehouseOverallController');
jest.mock('../src/controllers/sunshineBagController');

describe('cleanupOldLogs', () => {
  beforeEach(() => {
    (mockPool.query as jest.Mock).mockReset().mockResolvedValue({});
    (refreshWarehouseOverall as jest.Mock).mockReset().mockResolvedValue(undefined);
    (refreshSunshineBagOverall as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('aggregates previous year and deletes old rows', async () => {
    const nextYear = new Date().getFullYear() + 1;
    await cleanupOldLogs(new Date(`${nextYear}-01-31T00:00:00Z`));

    const previousYear = nextYear - 1;
    for (let month = 1; month <= 12; month++) {
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(previousYear, month);
      expect(refreshSunshineBagOverall).toHaveBeenCalledWith(previousYear, month);
    }

    const cutoff = `${nextYear}-01-01`;
    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM sunshine_bag_log WHERE date < $1',
      [cutoff],
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM surplus_log WHERE date < $1',
      [cutoff],
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM pig_pound_log WHERE date < $1',
      [cutoff],
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM outgoing_donation_log WHERE date < $1',
      [cutoff],
    );
  });
});
