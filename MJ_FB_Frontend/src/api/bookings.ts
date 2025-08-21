import { API_BASE, apiFetch, handleResponse } from './client';
import type { Slot, SlotsByDate } from '../types';

export async function getSlots(token: string, date?: string) {
  let url = `${API_BASE}/slots`;
  if (date) url += `?date=${encodeURIComponent(date)}`;
  const res = await apiFetch(url);
  const data = await handleResponse(res);
  return data.map((s: any) => ({
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    available: s.available,
  })) as Slot[];
}

export async function getSlotsRange(
  token: string,
  start: string,
  days: number,
): Promise<SlotsByDate[]> {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (days) params.append('days', String(days));
  const res = await apiFetch(`${API_BASE}/slots/range?${params.toString()}`);
  const data = await handleResponse(res);
  return data.map((d: any) => ({
    date: d.date,
    slots: (d.slots as any[]).map(s => ({
      id: String(s.id),
      startTime: s.startTime ?? s.start_time,
      endTime: s.endTime ?? s.end_time,
      available: s.available,
    })) as Slot[],
  }));
}

export async function createBooking(token: string, slotId: string, date: string) {
  const res = await apiFetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slotId: Number(slotId), date, requestData: '' }),
  });
  return handleResponse(res);
}

export async function getBookings(token: string, opts: { status?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  const query = params.toString();
  const res = await apiFetch(`${API_BASE}/bookings${query ? `?${query}` : ''}`);
  return handleResponse(res);
}

export async function getBookingHistory(
  token: string,
  opts: { status?: string; past?: boolean; userId?: number } = {}
) {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  if (opts.past) params.append('past', 'true');
  if (opts.userId) params.append('userId', String(opts.userId));
  const res = await apiFetch(
    `${API_BASE}/bookings/history?${params.toString()}`,
  );
  return handleResponse(res);
}

export async function getHolidays(token: string) {
  const res = await apiFetch(`${API_BASE}/holidays`);
  return handleResponse(res);
}

export async function addHoliday(token: string, date: string, reason: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/holidays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, reason }),
  });
  await handleResponse(res);
}

export async function removeHoliday(token: string, date: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/holidays/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function getAllSlots(token: string) {
  const res = await apiFetch(`${API_BASE}/slots/all`);
  const data = await handleResponse(res);
  return data.map((s: any) => ({
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    available: s.available,
  })) as Slot[];
}

export async function getBlockedSlots(token: string, date: string) {
  const res = await apiFetch(`${API_BASE}/blocked-slots?date=${encodeURIComponent(date)}`);
  return handleResponse(res);
}

export async function addBlockedSlot(
  token: string,
  date: string,
  slotId: number,
  reason: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/blocked-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, slotId, reason }),
  });
  await handleResponse(res);
}

export async function removeBlockedSlot(token: string, date: string, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/blocked-slots/${encodeURIComponent(date)}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function getBreaks(token: string) {
  const res = await apiFetch(`${API_BASE}/breaks`);
  return handleResponse(res);
}

export async function addBreak(
  token: string,
  dayOfWeek: number,
  slotId: number,
  reason: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/breaks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dayOfWeek, slotId, reason }),
  });
  await handleResponse(res);
}

export async function removeBreak(token: string, dayOfWeek: number, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/breaks/${dayOfWeek}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function decideBooking(
  token: string,
  bookingId: string,
  decision: 'approve' | 'reject',
  reason: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision, reason }),
  });
  await handleResponse(res);
}

export async function cancelBooking(
  token: string,
  bookingId: string,
  reason?: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  await handleResponse(res);
}

export async function createBookingForUser(
  token: string,
  userId: number,
  slotId: number,
  date: string,
  isStaffBooking: boolean
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, slotId, date, isStaffBooking }),
  });
  await handleResponse(res);
}

export async function rescheduleBookingByToken(
  token: string,
  slotId: string,
  date: string,
  authToken?: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await apiFetch(`${API_BASE}/bookings/reschedule/${token}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ slotId, date }),
  });
  await handleResponse(res);
}
