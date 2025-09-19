import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
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
  const res = await jsonApiFetch(`${API_BASE}/client-visits`, {
    method: 'POST',
    body: {
      ...payload,
      adults: payload.adults,
      children: payload.children,
      verified: payload.verified,
      note: payload.note ?? undefined,
    },
  });
  return handleResponse(res);
}

export async function updateClientVisit(
  id: number,
  payload: Partial<Omit<ClientVisit, 'id' | 'clientName'>>,
): Promise<ClientVisit> {
  const res = await jsonApiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'PUT',
    body: {
      ...payload,
      adults: payload.adults ?? undefined,
      children: payload.children ?? undefined,
      verified: payload.verified ?? undefined,
      note: payload.note ?? undefined,
    },
  });
  return handleResponse(res);
}

export async function deleteClientVisit(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function toggleClientVisitVerification(
  id: number,
): Promise<ClientVisit> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}/verify`, {
    method: 'PATCH',
  });
  return handleResponse(res);
}

export interface VisitStat {
  month: string;
  clients: number;
  adults: number;
  children: number;
}

interface VisitStatParams {
  months?: number;
  group?: string;
}

export async function getVisitStats(
  params: VisitStatParams = {},
): Promise<VisitStat[]> {
  const url = new URL(`${API_BASE}/client-visits/stats`);
  if (params.months != null) url.searchParams.set('months', String(params.months));
  if (params.group != null) url.searchParams.set('group', params.group);
  const res = await apiFetch(url.toString());
  const data = await handleResponse<any[]>(res);
  return data.map(row => ({
    month: row.month ?? row.date ?? '',
    clients: row.clients ?? row.total ?? 0,
    adults: row.adults ?? 0,
    children: row.children ?? 0,
  }));
}

