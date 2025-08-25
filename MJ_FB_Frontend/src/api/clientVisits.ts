import { API_BASE, apiFetch, handleResponse } from './client';

export interface ClientVisit {
  id: number;
  userId: number;
  date: string;
}

export async function getClientVisits(date: string): Promise<ClientVisit[]> {
  const res = await apiFetch(
    `${API_BASE}/client-visits?date=${encodeURIComponent(date)}`,
  );
  return handleResponse(res);
}

export async function createClientVisit(
  payload: Omit<ClientVisit, 'id'>,
): Promise<ClientVisit> {
  const res = await apiFetch(`${API_BASE}/client-visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateClientVisit(
  id: number,
  payload: Partial<Omit<ClientVisit, 'id'>>,
): Promise<ClientVisit> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteClientVisit(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/client-visits/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

