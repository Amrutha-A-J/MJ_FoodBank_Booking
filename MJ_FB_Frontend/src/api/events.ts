import { API_BASE, apiFetch, handleResponse } from './client';

export interface CreateEventInput {
  title: string;
  details: string;
  category: string;
  date: string;
  staffIds?: number[];
}

export async function createEvent(data: CreateEventInput): Promise<{ id: number }> {
  const res = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
