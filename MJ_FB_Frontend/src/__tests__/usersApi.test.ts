import { apiFetch, handleResponse } from '../api/client';
import { loginUser, addUser, sendRegistrationOtp, registerUser } from '../api/users';

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

  it('rejects loginUser with invalid clientId', async () => {
    await expect(loginUser('abc', 'pw')).rejects.toThrow('Invalid client ID');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects addUser with invalid clientId', async () => {
    await expect(addUser('John', 'Doe', 'abc', 'shopper', true)).rejects.toThrow(
      'Invalid client ID',
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects sendRegistrationOtp with invalid clientId', async () => {
    await expect(sendRegistrationOtp('abc', 'a@b.com')).rejects.toThrow('Invalid client ID');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects registerUser with invalid clientId', async () => {
    await expect(
      registerUser({
        clientId: 'abc',
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        password: 'pw',
        otp: '123456',
      }),
    ).rejects.toThrow('Invalid client ID');
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
