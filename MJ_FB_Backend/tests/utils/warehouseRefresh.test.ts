import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../../src/utils/warehouseRefresh';
import { refreshWarehouseOverall } from '../../src/controllers/warehouse/warehouseOverallController';

jest.mock('../../src/controllers/warehouse/warehouseOverallController', () => ({
  refreshWarehouseOverall: jest.fn(),
}));

describe('warehouseRefresh', () => {
  beforeEach(() => {
    (refreshWarehouseOverall as jest.Mock).mockReset();
  });

  it('refreshes aggregates for a single date', async () => {
    await refreshWarehouseForDate('2024-05-15');
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
  });

  it('refreshes only the new month when date change stays in same month', async () => {
    await refreshWarehouseForDateChange('2024-05-15', '2024-05-01');
    expect(refreshWarehouseOverall).toHaveBeenCalledTimes(1);
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
  });

  it('refreshes both months when date change crosses months', async () => {
    await refreshWarehouseForDateChange('2024-05-01', '2024-04-30');
    expect(refreshWarehouseOverall).toHaveBeenNthCalledWith(1, 2024, 5);
    expect(refreshWarehouseOverall).toHaveBeenNthCalledWith(2, 2024, 4);
  });

  it('skips old month refresh when old date missing', async () => {
    await refreshWarehouseForDateChange('2024-05-01');
    expect(refreshWarehouseOverall).toHaveBeenCalledTimes(1);
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
  });
});
