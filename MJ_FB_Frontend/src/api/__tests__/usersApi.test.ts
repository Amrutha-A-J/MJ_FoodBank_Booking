import { apiFetch, jsonApiFetch } from '../client';
import { deleteUser, login } from '../users';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('users api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls delete endpoint', async () => {
    await deleteUser(5);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/id/5', expect.objectContaining({ method: 'DELETE' }));
  });

  it('logs in client with email', async () => {
    await login('user@example.com', 'secret');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: { password: 'secret', email: 'user@example.com' },
      }),
    );
  });
});
