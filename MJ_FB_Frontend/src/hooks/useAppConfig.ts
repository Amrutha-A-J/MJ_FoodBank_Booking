import { useQuery } from '@tanstack/react-query';
import { getAppConfig, type AppConfig } from '../api/appConfig';

const STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const GC_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function useAppConfig() {
  const { data, isFetching, error, refetch } = useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    appConfig: data ?? { cartTare: 0 },
    isLoading: isFetching,
    refetch,
    error,
  };
}

