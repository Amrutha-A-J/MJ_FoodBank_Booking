import { apiFetch } from '../client';
import { getMailLists, sendMailListEmails } from '../monetaryDonors';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('monetary donor mail lists api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('fetches mail lists for month and year', async () => {
    await getMailLists(2024, 5);
    expect(apiFetch).toHaveBeenCalledWith('/api/monetary-donors/mail-lists?year=2024&month=5');
  });

  it('sends mail list emails with template id', async () => {
    await sendMailListEmails(2024, 5, 11);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors/mail-lists/send',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: 2024, month: 5, templateId: 11 }),
      }),
    );
  });
});

