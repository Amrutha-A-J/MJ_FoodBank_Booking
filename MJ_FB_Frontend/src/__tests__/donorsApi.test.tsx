import { apiFetch, handleResponse } from '../api/client';
import { updateDonor } from '../api/donors';

jest.mock('../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('donors api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('updates a donor with optional contact information', async () => {
    await updateDonor(7, {
      firstName: 'Alice',
      lastName: 'Helper',
      email: 'alice@example.com',
      phone: '306-555-0100',
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/donors/7',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Alice',
          lastName: 'Helper',
          email: 'alice@example.com',
          phone: '306-555-0100',
        }),
      }),
    );
    expect(handleResponse).toHaveBeenCalled();
  });
});
