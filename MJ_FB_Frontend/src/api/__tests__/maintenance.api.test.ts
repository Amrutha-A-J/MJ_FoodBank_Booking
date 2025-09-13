import { apiFetch } from '../client';
import { getMaintenance, updateMaintenance, clearMaintenance } from '../maintenance';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('maintenance api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('fetches maintenance settings', async () => {
    await getMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance');
  });

  it('updates maintenance settings', async () => {
    await updateMaintenance({ maintenanceMode: true, notice: 'test' });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/maintenance',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: true, notice: 'test' }),
      }),
    );
  });

  it('clears maintenance stats', async () => {
    await clearMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/maintenance/stats', { method: 'DELETE' });
  });
});
