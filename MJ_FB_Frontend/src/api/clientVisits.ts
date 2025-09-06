import { API_BASE, apiFetch, handleResponse } from './client';
import type { ClientVisit } from '../types';
export type { ClientVisit } from '../types';

export async function getClientVisits(date: string): Promise<ClientVisit[]> {
  const res = await apiFetch(
    `${API_BASE}/client-visits?date=${encodeURIComponent(date)}`,
  );
  return handleResponse(res);
}

export async function createClientVisit(
  payload: Omit<ClientVisit, 'id' | 'clientName'>,
): Promise<ClientVisit> {
  const res = await apiFetch(`${API_BASE}/client-visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      adults: payload.adults,
      children: payload.children,
      note: payload.note ?? undefined,
    }),
  });
  return handleResponse(res);
}

export async function updateClientVisit(
  id: number,
  payload: Partial<Omit<ClientVisit, 'id' | 'clientName'>>,
): Promise<ClientVisit> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      adults: payload.adults ?? undefined,
      children: payload.children ?? undefined,
      note: payload.note ?? undefined,
    }),
  });
  return handleResponse(res);
}

export async function deleteClientVisit(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export interface VisitImportSheet {
  date: string;
  rows: number;
  errors: string[];
}

export interface VisitImportPreview {
  sheets: VisitImportSheet[];
}

export interface VisitStat {
  date: string;
  total: number;
  adults: number;
  children: number;
}

export async function getVisitStats(days?: number): Promise<VisitStat[]> {
  const url = new URL(`${API_BASE}/client-visits/stats`);
  if (days != null) url.searchParams.set('days', String(days));
  const res = await apiFetch(url.toString());
  return handleResponse(res);
}

export async function importVisitsXlsx(
  formData: FormData,
  dryRun?: boolean,
): Promise<VisitImportPreview | void> {
  let url = `${API_BASE}/visits/import/xlsx`;
  if (dryRun) url += '?dryRun=true';

  const res = await apiFetch(url, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

