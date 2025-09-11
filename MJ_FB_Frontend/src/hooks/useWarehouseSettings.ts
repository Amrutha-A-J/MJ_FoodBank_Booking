import { useQuery } from '@tanstack/react-query';
import { getWarehouseSettings, type WarehouseSettings } from '../api/warehouseSettings';

export default function useWarehouseSettings(
  enabled = true,
  staleTime = 60 * 60 * 1000,
  gcTime = 6 * 60 * 60 * 1000,
) {
  const { data, isFetching, refetch, error } = useQuery<WarehouseSettings>({
    queryKey: ['warehouse-settings'],
    queryFn: getWarehouseSettings,
    enabled,
    staleTime,
    gcTime,
  });

  return { settings: data, isLoading: isFetching, refetch, error };
}

