import { useQuery } from '@tanstack/react-query';
import {
  getMonetaryDonorInsights,
  type MonetaryDonorInsightsResponse,
} from '../api/monetaryDonors';

export interface UseMonetaryDonorInsightsOptions {
  months?: number;
  endMonth?: string;
  enabled?: boolean;
}

export default function useMonetaryDonorInsights({
  months,
  endMonth,
  enabled = true,
}: UseMonetaryDonorInsightsOptions = {}) {
  const query = useQuery<MonetaryDonorInsightsResponse, Error>({
    queryKey: ['monetary-donor-insights', { months: months ?? null, endMonth: endMonth ?? null }],
    queryFn: () => getMonetaryDonorInsights({ months, endMonth }),
    enabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
