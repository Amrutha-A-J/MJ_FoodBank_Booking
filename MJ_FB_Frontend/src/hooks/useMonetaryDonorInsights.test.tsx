import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMonetaryDonorInsights from './useMonetaryDonorInsights';
import { getMonetaryDonorInsights } from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonorInsights: jest.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMonetaryDonorInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches insights with params and caches by query key', async () => {
    const mockInsights = {
      window: { startMonth: '2023-01', endMonth: '2023-12', months: 12 },
      monthly: [],
      ytd: {
        totalAmount: 0,
        donationCount: 0,
        donorCount: 0,
        averageGift: 0,
        averageDonationsPerDonor: 0,
        lastDonationISO: null,
      },
      topDonors: [],
      givingTiers: {
        currentMonth: {
          month: '2023-12',
          tiers: {
            '1-100': { donorCount: 0, totalAmount: 0 },
            '101-500': { donorCount: 0, totalAmount: 0 },
            '501-1000': { donorCount: 0, totalAmount: 0 },
            '1001-10000': { donorCount: 0, totalAmount: 0 },
            '10001-30000': { donorCount: 0, totalAmount: 0 },
          },
        },
        previousMonth: {
          month: '2023-11',
          tiers: {
            '1-100': { donorCount: 0, totalAmount: 0 },
            '101-500': { donorCount: 0, totalAmount: 0 },
            '501-1000': { donorCount: 0, totalAmount: 0 },
            '1001-10000': { donorCount: 0, totalAmount: 0 },
            '10001-30000': { donorCount: 0, totalAmount: 0 },
          },
        },
      },
      firstTimeDonors: [],
      pantryImpact: { families: 0, adults: 0, children: 0, pounds: 0 },
    };
    (getMonetaryDonorInsights as jest.Mock).mockResolvedValueOnce(mockInsights);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useMonetaryDonorInsights({ months: 6, endMonth: '2024-03' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual(mockInsights));
    expect(getMonetaryDonorInsights).toHaveBeenCalledWith({ months: 6, endMonth: '2024-03' });

    const cachedQuery = queryClient.getQueryCache().find({
      queryKey: ['monetary-donor-insights', { months: 6, endMonth: '2024-03' }],
    });
    expect(cachedQuery).toBeDefined();
  });

  it('does not fetch when disabled', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useMonetaryDonorInsights({ enabled: false }),
      { wrapper },
    );

    expect(getMonetaryDonorInsights).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces errors from the api', async () => {
    const error = new Error('boom');
    (getMonetaryDonorInsights as jest.Mock).mockRejectedValueOnce(error);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useMonetaryDonorInsights(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
