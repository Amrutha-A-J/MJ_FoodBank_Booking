import { API_BASE, apiFetch, handleResponse } from './client';

export interface Event {
  id: number;
  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  details?: string;
  category?: string;
  createdBy: number;
  createdByName: string;
  visibleToVolunteers?: boolean;
  visibleToClients?: boolean;
  priority: number;
}

export interface EventGroups {
  today: Event[];
  upcoming: Event[];
  past: Event[];
}

export async function getEvents(): Promise<EventGroups> {
  const res = await apiFetch(`${API_BASE}/events`);
  return handleResponse(res);
}

export async function createEvent(data: {
  title: string;
  details?: string;
  category: string;
  startDate: string;
  endDate: string;
  visibleToVolunteers?: boolean;
  visibleToClients?: boolean;
  priority?: number;
}) {
  const res = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEvent(id: number, data: { priority: number }) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEvent(id: number) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
