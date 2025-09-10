import { API_BASE, apiFetch, handleResponse } from './client';

export async function getPantryWeekly(year: number, month: number) {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/weekly?year=${year}&month=${month}`);
  return handleResponse(res);
}

export async function getPantryMonthly(year: number, month: number) {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/monthly?year=${year}&month=${month}`);
  return handleResponse(res);
}

export async function getPantryYearly(year: number) {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/yearly?year=${year}`);
  return handleResponse(res);
}

export async function getPantryYears() {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/years`);
  return handleResponse(res);
}

export async function getPantryMonths(year: number) {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/months?year=${year}`);
  return handleResponse(res);
}

export async function getPantryWeeks(year: number, month: number) {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/weeks?year=${year}&month=${month}`);
  return handleResponse(res);
}

export async function exportPantryAggregations(params: {
  period: 'weekly' | 'monthly' | 'yearly';
  year: number;
  month?: number;
  week?: number;
}): Promise<{ blob: Blob; fileName: string }> {
  const search = new URLSearchParams({ period: params.period, year: String(params.year) });
  if (params.month != null) search.append('month', String(params.month));
  if (params.week != null) search.append('week', String(params.week));
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/export?${search.toString()}`);
  if (!res.ok) await handleResponse(res);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = match ? match[1] : 'pantry_aggregations.xlsx';
  return { blob, fileName };
}

export async function rebuildPantryAggregations() {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/rebuild`, { method: 'POST' });
  await handleResponse(res);
}
