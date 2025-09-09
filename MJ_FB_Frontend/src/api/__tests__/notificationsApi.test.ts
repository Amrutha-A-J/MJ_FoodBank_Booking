import { apiFetch, handleResponse } from '../client';
import { registerPushToken } from '../notifications';

jest.mock('../client', () => ({
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('notifications api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('registers token', async () => {
    await registerPushToken('abc');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/notifications/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'abc' }),
      }),
    );
  });
});
