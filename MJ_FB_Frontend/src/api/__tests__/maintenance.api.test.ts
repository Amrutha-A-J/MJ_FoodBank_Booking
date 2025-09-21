import { apiFetch, jsonApiFetch, handleResponse } from '../client';
import {
  getMaintenance,
  updateMaintenance,
  clearMaintenance,
  vacuumDatabase,
  vacuumTable,
  getVacuumDeadRows,
  purgeOldRecords,
} from '../maintenance';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('maintenance api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (handleResponse as jest.Mock).mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  it('fetches maintenance settings', async () => {
    await getMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance');
  });

  it('updates maintenance settings', async () => {
    await updateMaintenance({ maintenanceMode: true, notice: 'test' });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/maintenance',
      expect.objectContaining({
        method: 'PUT',
        body: { maintenanceMode: true, notice: 'test' },
      }),
    );
  });

  it('clears maintenance stats', async () => {
    await clearMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/stats', { method: 'DELETE' });
  });

  it('triggers a full vacuum', async () => {
    await vacuumDatabase();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/vacuum', { method: 'POST' });
  });

  it('triggers a table vacuum', async () => {
    await vacuumTable('public.users');
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/vacuum/public.users', { method: 'POST' });
  });

  it('fetches dead rows without filter', async () => {
    await getVacuumDeadRows();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/vacuum/dead-rows');
  });

  it('fetches dead rows for a table', async () => {
    await getVacuumDeadRows('orders');
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/vacuum/dead-rows?table=orders');
  });

  it('purges old records', async () => {
    (handleResponse as jest.Mock).mockResolvedValue({ success: true });
    await purgeOldRecords({ tables: ['bookings'], before: '2023-12-31' });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/maintenance/purge',
      expect.objectContaining({
        method: 'POST',
        body: { tables: ['bookings'], before: '2023-12-31' },
      }),
    );
  });
});
