import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import {
  getMonetaryDonorInsights,
  type MonetaryDonorInsightsParams,
  type MonetaryDonorInsightsResponse,
} from '../api/monetaryDonorInsights';

export default function useMonetaryDonorInsights(
  params: MonetaryDonorInsightsParams = {},
) {
  const { months, endMonth } = params;
  const query = useQuery<MonetaryDonorInsightsResponse, ApiError>({
    queryKey: ['monetary-donor-insights', months ?? null, endMonth ?? null],
    queryFn: () => getMonetaryDonorInsights(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    insights: query.data,
    isLoading: query.isFetching && !query.data,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    error: query.error ?? null,
  };
}
