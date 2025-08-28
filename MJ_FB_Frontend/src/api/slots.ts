import { API_BASE, apiFetch, handleResponse } from './client';
import type { Slot } from '../types';

export async function getAllSlots(): Promise<Slot[]> {
  const res = await apiFetch(`${API_BASE}/slots/all`);
  const data = await handleResponse(res);
  return data.map((s: any) => ({
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    maxCapacity: s.maxCapacity ?? s.max_capacity,
  }));
}

export async function createSlot(startTime: string, endTime: string, maxCapacity: number): Promise<Slot> {
  const res = await apiFetch(`${API_BASE}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startTime, endTime, maxCapacity }),
  });
  const s = await handleResponse(res);
  return {
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    maxCapacity: s.maxCapacity ?? s.max_capacity,
  };
}

export async function updateSlot(id: number, startTime: string, endTime: string, maxCapacity: number): Promise<Slot> {
  const res = await apiFetch(`${API_BASE}/slots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startTime, endTime, maxCapacity }),
  });
  const s = await handleResponse(res);
  return {
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    maxCapacity: s.maxCapacity ?? s.max_capacity,
  };
}

export async function deleteSlot(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/slots/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}
