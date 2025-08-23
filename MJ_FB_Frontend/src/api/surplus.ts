import { API_BASE, apiFetch, handleResponse } from './client';

export interface Surplus {
  id: number;
  date: string;
  type: 'BREAD' | 'CANS';
  count: number;
  weight: number;
}

export async function getSurplus(): Promise<Surplus[]> {
  const res = await apiFetch(`${API_BASE}/surplus`);
  return handleResponse(res);
}

export async function createSurplus(data: { date: string; type: 'BREAD' | 'CANS'; count: number }): Promise<Surplus> {
  const res = await apiFetch(`${API_BASE}/surplus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateSurplus(
  id: number,
  data: { date: string; type: 'BREAD' | 'CANS'; count: number },
): Promise<Surplus> {
  const res = await apiFetch(`${API_BASE}/surplus/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteSurplus(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/surplus/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}
