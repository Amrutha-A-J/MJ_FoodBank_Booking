import { apiFetch, jsonApiFetch } from '../client';
import { deleteVolunteer, updateVolunteer } from '../volunteers';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('volunteers api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls delete volunteer endpoint', async () => {
    await deleteVolunteer(3);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/volunteers/3', expect.objectContaining({ method: 'DELETE' }));
  });

  it('calls update volunteer endpoint', async () => {
    await updateVolunteer(5, { firstName: 'A', lastName: 'B' });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteers/5',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
