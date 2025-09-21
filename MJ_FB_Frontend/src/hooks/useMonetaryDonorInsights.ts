import { useQuery } from '@tanstack/react-query';
import {
  getMonetaryDonorInsights,
  type MonetaryDonorInsights,
} from '../api/monetaryDonorInsights';

interface UseMonetaryDonorInsightsOptions {
  months?: number;
  endMonth?: string;
  enabled?: boolean;
}

export default function useMonetaryDonorInsights(
  options: UseMonetaryDonorInsightsOptions = {},
) {
  const { months = 12, endMonth, enabled = true } = options;
  return useQuery<MonetaryDonorInsights>({
    queryKey: ['monetaryDonorInsights', months, endMonth],
    queryFn: () => getMonetaryDonorInsights({ months, endMonth }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
