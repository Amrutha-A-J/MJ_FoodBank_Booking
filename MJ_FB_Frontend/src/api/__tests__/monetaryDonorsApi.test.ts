import { apiFetch } from '../client';
import {
  createMonetaryDonor,
  updateMonetaryDonor,
  getMonetaryDonor,
  updateMonetaryDonation,
  deleteMonetaryDonation,
  getMailLists,
  sendMailListEmails,
} from '../monetaryDonors';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('monetary donor api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('creates a donor', async () => {
    await createMonetaryDonor({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        }),
      }),
    );
  });

  it('updates a donor', async () => {
    await updateMonetaryDonor(1, {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors/1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
        }),
      }),
    );
  });

  it('fetches a donor', async () => {
    await getMonetaryDonor(2);
    expect(apiFetch).toHaveBeenCalledWith('/api/monetary-donors/2');
  });

  it('updates a donation', async () => {
    await updateMonetaryDonation(5, {
      donorId: 3,
      amount: 50,
      date: '2024-01-01',
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors/donations/5',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId: 3,
          amount: 50,
          date: '2024-01-01',
        }),
      }),
    );
  });

  it('deletes a donation', async () => {
    await deleteMonetaryDonation(7);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors/donations/7',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('monetary donor mail lists api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('fetches mail lists for month and year', async () => {
    await getMailLists(2024, 5);
    expect(apiFetch).toHaveBeenCalledWith('/api/monetary-donors/mail-lists?year=2024&month=5');
  });

  it('sends mail list emails', async () => {
    await sendMailListEmails(2024, 5);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/monetary-donors/mail-lists/send',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: 2024, month: 5 }),
      }),
    );
  });
});

