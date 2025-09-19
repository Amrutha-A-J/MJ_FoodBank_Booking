import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
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
  const res = await jsonApiFetch(`${API_BASE}/slots`, {
    method: 'POST',
    body: data,
  });
  return handleResponse(res);
}

export async function updateSlot(
  id: number | string,
  data: { startTime: string; endTime: string; maxCapacity: number },
) {
  const res = await jsonApiFetch(`${API_BASE}/slots/${id}`, {
    method: 'PUT',
    body: data,
  });
  return handleResponse(res);
}

export async function updateSlotCapacity(newCapacity: number) {
  const res = await jsonApiFetch(`${API_BASE}/slots/capacity`, {
    method: 'PUT',
    body: { maxCapacity: newCapacity },
  });
  return handleResponse(res);
}

export async function deleteSlot(id: number | string) {
  const res = await apiFetch(`${API_BASE}/slots/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
