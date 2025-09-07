import { apiFetch } from '../client';
import { deleteUser } from '../users';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('users api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls delete endpoint', async () => {
    await deleteUser(5);
    expect(apiFetch).toHaveBeenCalledWith('/api/users/id/5', expect.objectContaining({ method: 'DELETE' }));
  });
});
