import { apiFetch } from '../client';
import { getMaintenance, updateMaintenance, clearMaintenance } from '../maintenance';

jest.mock('../client', () => ({
  API_BASE: 'http://localhost/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('maintenance api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('gets maintenance status', async () => {
    await getMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('http://localhost/api/v1/maintenance');
  });

  it('updates maintenance status', async () => {
    await updateMaintenance({ maintenanceMode: true, notice: 'test' });
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/maintenance',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ maintenanceMode: true, notice: 'test' }),
      }),
    );
  });

  it('clears maintenance', async () => {
    await clearMaintenance();
    expect(apiFetch).toHaveBeenCalledWith('http://localhost/api/v1/maintenance', { method: 'DELETE' });
  });
});
