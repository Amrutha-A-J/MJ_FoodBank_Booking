import { apiFetch, handleResponse, jsonApiFetch } from '../api/client';
import { updateDonor } from '../api/donors';

jest.mock('../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn(),
}));

describe('donors api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (handleResponse as jest.Mock).mockResolvedValue({
      id: 7,
      name: 'Alice Helper',
      email: null,
      phone: null,
      isPetFood: true,
    });
    jest.clearAllMocks();
  });

  it('updates a donor with optional contact information', async () => {
    await updateDonor(7, {
      name: 'Alice Helper',
      email: 'alice@example.com',
      phone: '306-555-0100',
      isPetFood: true,
    });

    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/donors/7',
      expect.objectContaining({
        method: 'PUT',
        body: {
          name: 'Alice Helper',
          email: 'alice@example.com',
          phone: '306-555-0100',
          isPetFood: true,
        },
      }),
    );
    expect(handleResponse).toHaveBeenCalled();
  });
});
