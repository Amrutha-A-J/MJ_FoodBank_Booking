import { apiFetch, handleResponse } from '../api/client';
import { login, addUser } from '../api/users';

jest.mock('../api/client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('users api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('sends clientId or email to login', async () => {
    await login('123', 'pw');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ clientId: 123, password: 'pw' }),
      }),
    );
    await login('user@example.com', 'pw');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'pw' }),
      }),
    );
  });

  it('rejects addUser with invalid clientId', async () => {
    await expect(addUser('abc', 'shopper', true)).rejects.toThrow(
      'Invalid client ID',
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends provided fields to addUser', async () => {
    await addUser('123', 'shopper', true, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'P@ssword1',
      sendPasswordLink: false,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/users/add-client',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientId: 123,
          role: 'shopper',
          onlineAccess: true,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'P@ssword1',
          sendPasswordLink: false,
        }),
      }),
    );
  });

  it('omits undefined fields in addUser', async () => {
    await addUser('123', 'shopper', false);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/users/add-client',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientId: 123,
          role: 'shopper',
          onlineAccess: false,
        }),
      }),
    );
  });

});
