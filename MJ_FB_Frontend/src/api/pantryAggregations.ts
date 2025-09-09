import { API_BASE, apiFetch, handleResponse } from './client';

export async function getPantryWeekly(year: number, week: number): Promise<any[]> {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/weekly?year=${year}&week=${week}`);
  return handleResponse(res);
}

export async function getPantryMonthly(year: number, month: number): Promise<any[]> {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/monthly?year=${year}&month=${month}`);
  return handleResponse(res);
}

export async function getPantryYearly(year: number): Promise<any[]> {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/yearly?year=${year}`);
  return handleResponse(res);
}

export async function getPantryYears(): Promise<number[]> {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/years`);
  return handleResponse(res);
}

export async function exportPantryAggregations(
  type: 'weekly' | 'monthly' | 'yearly',
  params: { year: number; month?: number; week?: number },
): Promise<Blob> {
  const search = new URLSearchParams({ year: String(params.year) });
  if (params.month !== undefined) search.append('month', String(params.month));
  if (params.week !== undefined) search.append('week', String(params.week));
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/${type}/export?${search.toString()}`);
  if (!res.ok) await handleResponse(res);
  return res.blob();
}

export async function rebuildPantryAggregations(year: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/rebuild?year=${year}`, {
    method: 'POST',
  });
  await handleResponse(res);
}

