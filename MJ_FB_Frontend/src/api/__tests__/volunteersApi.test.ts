import { apiFetch } from '../client';
import {
  deleteVolunteer,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
} from '../volunteers';

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

  it('creates volunteer shopper profile', async () => {
    await createVolunteerShopperProfile(4, '123', 'e@example.com', '555-1234');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteers/4/shopper',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ clientId: 123, email: 'e@example.com', phone: '555-1234' }),
      }),
    );
  });

  it('removes volunteer shopper profile', async () => {
    await removeVolunteerShopperProfile(5);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteers/5/shopper',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
