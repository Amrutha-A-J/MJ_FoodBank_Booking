import { API_BASE, apiFetch, handleResponse } from './client';

export interface WarehouseOverall {
  month: number;
  donations: number;
  surplus: number;
  pigPound: number;
  outgoingDonations: number;
}

export async function getWarehouseOverall(year: number): Promise<WarehouseOverall[]> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall?year=${year}`);
  return handleResponse(res);
}

export async function rebuildWarehouseOverall(year: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/rebuild?year=${year}`, { method: 'POST' });
  await handleResponse(res);
}
