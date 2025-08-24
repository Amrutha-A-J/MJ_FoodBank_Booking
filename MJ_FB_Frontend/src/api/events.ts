import { API_BASE, apiFetch, handleResponse } from './client';

export interface Event {
  id: number;
  title: string;
  date: string; // ISO string
  description?: string;
}

export async function getEvents(): Promise<Event[]> {
  const res = await apiFetch(`${API_BASE}/events`);
  return handleResponse(res);
}
