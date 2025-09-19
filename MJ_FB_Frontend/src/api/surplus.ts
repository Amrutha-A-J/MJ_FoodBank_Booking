import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

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
  const res = await jsonApiFetch(`${API_BASE}/surplus`, {
    method: 'POST',
    body: data,
  });
  return handleResponse(res);
}

export async function updateSurplus(
  id: number,
  data: { date: string; type: 'BREAD' | 'CANS'; count: number },
): Promise<Surplus> {
  const res = await jsonApiFetch(`${API_BASE}/surplus/${id}`, {
    method: 'PUT',
    body: data,
  });
  return handleResponse(res);
}

export async function deleteSurplus(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/surplus/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}
