import { useQuery } from '@tanstack/react-query';
import { getRoles } from '../api/volunteers';
import type { RoleOption } from '../types';

export default function useVolunteerRoles(
  enabled = true,
  staleTime = 5 * 60 * 1000,
  gcTime = 30 * 60 * 1000,
) {
  const { data, isFetching, refetch, error } = useQuery<RoleOption[]>({
    queryKey: ['volunteerRoles'],
    queryFn: getRoles,
    enabled,
    staleTime,
    gcTime,
  });

  return { roles: data ?? [], isLoading: isFetching, refetch, error };
}
