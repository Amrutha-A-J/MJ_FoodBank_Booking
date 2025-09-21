import { apiFetch, jsonApiFetch, handleResponse } from '../client';
import {
  createMonetaryDonor,
  updateMonetaryDonor,
  getMonetaryDonor,
  getMonetaryDonors,
  getMonetaryDonorInsights,
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

describe('monetary donor insights api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
  });

  it('fetches insights and returns parsed data', async () => {
    const mockInsights = {
      window: { startMonth: '2023-01', endMonth: '2023-12', months: 12 },
      monthly: [
        {
          month: '2023-12',
          totalAmount: 1200,
          donationCount: 15,
          donorCount: 10,
          averageGift: 80,
        },
      ],
      ytd: {
        totalAmount: 8500,
        donationCount: 70,
        donorCount: 45,
        averageGift: 121.43,
        averageDonationsPerDonor: 1.56,
        lastDonationISO: '2023-12-28',
      },
      topDonors: [
        {
          id: 1,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          windowAmount: 600,
          lifetimeAmount: 2500,
          lastDonationISO: '2023-12-01',
        },
      ],
      givingTiers: {
        currentMonth: {
          month: '2023-12',
          tiers: {
            '1-100': { donorCount: 4, totalAmount: 200 },
            '101-500': { donorCount: 3, totalAmount: 600 },
            '501-1000': { donorCount: 2, totalAmount: 400 },
            '1001-10000': { donorCount: 0, totalAmount: 0 },
            '10001-30000': { donorCount: 0, totalAmount: 0 },
          },
        },
        previousMonth: {
          month: '2023-11',
          tiers: {
            '1-100': { donorCount: 5, totalAmount: 250 },
            '101-500': { donorCount: 2, totalAmount: 300 },
            '501-1000': { donorCount: 1, totalAmount: 500 },
            '1001-10000': { donorCount: 0, totalAmount: 0 },
            '10001-30000': { donorCount: 0, totalAmount: 0 },
          },
        },
      },
      firstTimeDonors: [
        {
          id: 2,
          firstName: 'Bob',
          lastName: 'Jones',
          email: null,
          firstDonationISO: '2023-12-15',
          amount: 150,
        },
      ],
      pantryImpact: { families: 25, adults: 40, children: 30, pounds: 1200 },
    };

    (handleResponse as jest.Mock).mockResolvedValueOnce(mockInsights);

    const result = await getMonetaryDonorInsights();

    expect(apiFetch).toHaveBeenCalledWith('/api/v1/monetary-donors/insights');
    expect(result).toEqual(mockInsights);
  });

  it('passes optional query params', async () => {
    (handleResponse as jest.Mock).mockResolvedValueOnce(undefined);

    await getMonetaryDonorInsights({ months: 6, endMonth: '2024-03' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/monetary-donors/insights?months=6&endMonth=2024-03',
    );
  });

  it('propagates fetch errors', async () => {
    const error = new Error('network error');
    (apiFetch as jest.Mock).mockRejectedValueOnce(error);

    await expect(getMonetaryDonorInsights()).rejects.toThrow(error);
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

