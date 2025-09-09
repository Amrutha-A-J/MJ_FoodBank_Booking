import { apiFetch } from '../client';
import { deleteVolunteer, updateVolunteer } from '../volunteers';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('volunteers api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls delete volunteer endpoint', async () => {
    await deleteVolunteer(3);
    expect(apiFetch).toHaveBeenCalledWith('/api/volunteers/3', expect.objectContaining({ method: 'DELETE' }));
  });

  it('calls update volunteer endpoint', async () => {
    await updateVolunteer(5, { firstName: 'A', lastName: 'B' });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteers/5',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
