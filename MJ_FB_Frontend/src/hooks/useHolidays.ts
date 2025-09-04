import { useQuery } from '@tanstack/react-query';
import { getHolidays } from '../api/bookings';
import type { Holiday } from '../types';

export default function useHolidays(
  enabled = true,
  staleTime = 5 * 60 * 1000,
  gcTime = 30 * 60 * 1000,
) {
  const { data, isFetching, refetch, error } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: getHolidays,
    enabled,
    staleTime,
    gcTime,
  });

  return { holidays: data ?? [], isLoading: isFetching, refetch, error };
}

