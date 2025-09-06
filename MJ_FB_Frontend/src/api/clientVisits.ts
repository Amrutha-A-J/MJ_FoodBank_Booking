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
      date: payload.date,
      clientId: payload.clientId,
      anonymous: payload.anonymous,
      weightWithCart: payload.weightWithCart,
      weightWithoutCart: payload.weightWithoutCart,
      petItem: payload.petItem,
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
      adults: payload.adults,
      children: payload.children,
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

