import { API_BASE, apiFetch, handleResponse } from './client';

export interface PigPound {
  id: number;
  date: string;
  weight: number;
}

export async function getPigPounds(date: string): Promise<PigPound[]> {
  const res = await apiFetch(`${API_BASE}/pig-pounds?date=${date}`);
  return handleResponse(res);
}

export async function createPigPound(data: { date: string; weight: number }): Promise<PigPound> {
  const res = await apiFetch(`${API_BASE}/pig-pounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updatePigPound(id: number, data: { date: string; weight: number }): Promise<PigPound> {
  const res = await apiFetch(`${API_BASE}/pig-pounds/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deletePigPound(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/pig-pounds/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}
