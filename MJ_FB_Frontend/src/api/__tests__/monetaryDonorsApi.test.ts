import { apiFetch, jsonApiFetch } from '../client';
import {
  createMonetaryDonor,
  updateMonetaryDonor,
  getMonetaryDonor,
  getMonetaryDonors,
  updateMonetaryDonation,
  deleteMonetaryDonation,
  importZeffyDonations,
  getMailLists,
  sendMailListEmails,
  sendTestMailListEmails,
  getDonorTestEmails,
  createDonorTestEmail,
  updateDonorTestEmail,
  deleteDonorTestEmail,
} from '../monetaryDonors';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('monetary donor api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('creates a donor', async () => {
    await createMonetaryDonor({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors',
      expect.objectContaining({
        method: 'POST',
        body: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      }),
    );
  });

  it('updates a donor', async () => {
    await updateMonetaryDonor(1, {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
    });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/1',
      expect.objectContaining({
        method: 'PUT',
        body: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
        },
      }),
    );
  });

  it('fetches a donor', async () => {
    await getMonetaryDonor(2);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/monetary-donors/2');
  });

  it('fetches donors with search', async () => {
    await getMonetaryDonors('Jane');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors?search=Jane',
    );
  });

  it('updates a donation', async () => {
    await updateMonetaryDonation(5, {
      donorId: 3,
      amount: 50,
      date: '2024-01-01',
    });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/donations/5',
      expect.objectContaining({
        method: 'PUT',
        body: {
          donorId: 3,
          amount: 50,
          date: '2024-01-01',
        },
      }),
    );
  });

  it('deletes a donation', async () => {
    await deleteMonetaryDonation(7);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/donations/7',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('imports zeffy donations', async () => {
    const file = new File(['csv'], 'donations.csv');
    await importZeffyDonations(file);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/import',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
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
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/monetary-donors/mail-lists?year=2024&month=5');
  });

  it('sends mail list emails', async () => {
    await sendMailListEmails({ year: 2024, month: 5 });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/mail-lists/send',
      expect.objectContaining({
        method: 'POST',
        body: { year: 2024, month: 5 },
      }),
    );
  });

  it('sends test mail list emails', async () => {
    await sendTestMailListEmails({ year: 2024, month: 5 });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/mail-lists/test',
      expect.objectContaining({
        method: 'POST',
        body: { year: 2024, month: 5 },
      }),
    );
  });

  it('manages donor test emails', async () => {
    await getDonorTestEmails();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/monetary-donors/test-emails');

    await createDonorTestEmail('a@test.com');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/test-emails',
      expect.objectContaining({
        method: 'POST',
        body: { email: 'a@test.com' },
      }),
    );

    await updateDonorTestEmail(1, 'b@test.com');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/test-emails/1',
      expect.objectContaining({
        method: 'PUT',
        body: { email: 'b@test.com' },
      }),
    );

    await deleteDonorTestEmail(1);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/test-emails/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

