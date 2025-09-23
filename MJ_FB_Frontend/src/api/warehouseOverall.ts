import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface WarehouseOverall {
  month: number;
  donations: number;
  surplus: number;
  pigPound: number;
  petFood: number;
  outgoingDonations: number;
}

export async function getWarehouseOverallYears(): Promise<number[]> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/years`);
  return handleResponse(res);
}

export async function getWarehouseOverall(year: number): Promise<WarehouseOverall[]> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall?year=${year}`);
  return handleResponse(res);
}

export async function rebuildWarehouseOverall(year: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/rebuild?year=${year}`, { method: 'POST' });
  await handleResponse(res);
}

export interface ManualWarehouseOverall {
  year: number;
  month: number;
  donations: number;
  surplus: number;
  pigPound: number;
  petFood: number;
  outgoingDonations: number;
}

export async function postManualWarehouseOverall(data: ManualWarehouseOverall): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/warehouse-overall/manual`, {
    method: 'POST',
    body: data,
  });
  await handleResponse(res);
}

export async function exportWarehouseOverall(year: number): Promise<Blob> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/export?year=${year}`);
  if (!res.ok) await handleResponse(res);
  return res.blob();
}

export interface WarehouseDonationHistoryEntry {
  year: number;
  donations: number;
  petFood: number;
  total: number;
}

export async function getWarehouseDonationHistory(): Promise<WarehouseDonationHistoryEntry[]> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/donation-history`);
  return handleResponse(res);
}

export async function exportWarehouseDonationHistory(): Promise<Blob> {
  const res = await apiFetch(`${API_BASE}/warehouse-overall/donation-history/export`);
  if (!res.ok) await handleResponse(res);
  return res.blob();
}
