import { API_BASE, apiFetch, handleResponse } from './client';
import type { Slot } from '../types';

export async function getAllSlots(): Promise<Slot[]> {
  const res = await apiFetch(`${API_BASE}/slots/all`);
  return handleResponse(res);
}

export async function createSlot(data: {
  startTime: string;
  endTime: string;
  maxCapacity: number;
}) {
  const res = await apiFetch(`${API_BASE}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateSlot(
  id: number | string,
  data: { startTime: string; endTime: string; maxCapacity: number },
) {
  const res = await apiFetch(`${API_BASE}/slots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteSlot(id: number | string) {
  const res = await apiFetch(`${API_BASE}/slots/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
