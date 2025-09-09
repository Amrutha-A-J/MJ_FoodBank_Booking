import { apiFetch } from '../client';
import { deleteUser, login } from '../users';

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

  it('logs in client with email', async () => {
    await login('user@example.com', 'secret');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'secret', email: 'user@example.com' }),
      }),
    );
  });
});
