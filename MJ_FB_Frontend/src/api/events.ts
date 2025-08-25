import { API_BASE, apiFetch, handleResponse } from './client';

export interface Event {
  id: number;
  title: string;
  date: string; // ISO string
  details?: string;
  category?: string;
  staffIds?: number[];
  createdBy: number;
}

export async function getEvents(): Promise<Event[]> {
  const res = await apiFetch(`${API_BASE}/events`);
  return handleResponse(res);
}

export async function createEvent(data: {
  title: string;
  details?: string;
  category: string;
  date: string;
  staffIds: number[];
}) {
  const res = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
