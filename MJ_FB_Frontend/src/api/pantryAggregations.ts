import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
  let fileName: string;
  if (match) {
    fileName = match[1];
  } else {
    if (params.period === 'weekly' && params.month != null && params.week != null) {
      const monthStart = new Date(Date.UTC(params.year, params.month - 1, 1));
      const firstMonday = startOfWeek(monthStart);
      const start = new Date(firstMonday);
      start.setUTCDate(firstMonday.getUTCDate() + (params.week - 1) * 7);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 4);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const monthPadded = String(params.month).padStart(2, '0');
      fileName = `${params.year}_${monthPadded}_${startDate}_to_${endDate}_week_${params.week}_agggregation.xlsx`;
    } else if (params.period === 'monthly' && params.month != null) {
      const monthPadded = String(params.month).padStart(2, '0');
      fileName = `${params.year}_${monthPadded}_monthly_pantry_aggregation.xlsx`;
    } else if (params.period === 'yearly') {
      fileName = `${params.year}_yearly_pantry_aggregation.xlsx`;
    } else {
      fileName = 'pantry_aggregations.xlsx';
    }
  }
  return { blob, fileName };
}

export async function rebuildPantryAggregations() {
  const res = await apiFetch(`${API_BASE}/pantry-aggregations/rebuild`, { method: 'POST' });
  await handleResponse(res);
}

export async function postManualPantryAggregate(data: {
  year: number;
  month: number;
  week: number;
  orders: number;
  adults: number;
  children: number;
  weight: number;
}) {
  const body = { ...data, people: data.adults + data.children };
  const res = await jsonApiFetch(`${API_BASE}/pantry-aggregations/manual/weekly`, {
    method: 'POST',
    body,
  });
  await handleResponse(res);
}
