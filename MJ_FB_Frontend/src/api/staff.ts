import { API_BASE, apiFetch, handleResponse } from './client';

export interface StaffSearchResult {
  id: number;
  name: string;
}

export async function searchStaff(query: string): Promise<StaffSearchResult[]> {
  const res = await apiFetch(
    `${API_BASE}/staff/search?query=${encodeURIComponent(query)}`
  );
  return handleResponse(res);
}
