import { API_BASE, apiFetch, handleResponse } from './client';

export interface StaffOption {
  id: number;
  name: string;
}

export async function searchStaff(query: string): Promise<StaffOption[]> {
  const res = await apiFetch(
    `${API_BASE}/staff/search?query=${encodeURIComponent(query)}`,
  );
  return handleResponse(res);
}
