import { useQuery } from '@tanstack/react-query';
import { getMaintenance, type MaintenanceStatus } from '../api/maintenance';

const STALE_TIME = 60 * 1000; // 1 minute
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export default function useMaintenance() {
  const { data, isFetching, refetch } = useQuery<MaintenanceStatus>({
    queryKey: ['maintenance'],
    queryFn: getMaintenance,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    maintenanceMode: data?.maintenanceMode ?? false,
    notice: data?.notice ?? '',
    isLoading: isFetching,
    refetch,
  };
}
