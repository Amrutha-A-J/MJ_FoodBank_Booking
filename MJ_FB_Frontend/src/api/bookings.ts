import { API_BASE, apiFetch, handleResponse } from './client';
import type { Slot, SlotsByDate } from '../types';

export async function getSlots(date?: string) {
  let url = `${API_BASE}/slots`;
  if (date) url += `?date=${encodeURIComponent(date)}`;
  const res = await apiFetch(url);
  const data = await handleResponse(res);
  return data.map((s: any) => ({
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    available: s.available,
    reason: s.reason,
    status: s.status,
  })) as Slot[];
}

export async function getSlotsRange(
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
      reason: s.reason,
      status: s.status,
    })) as Slot[],
  }));
}

export async function createBooking(
  slotId: string,
  date: string,
  userId?: number,
) {
  const body: any = { slotId: Number(slotId), date, requestData: '' };
  if (userId) body.userId = userId;
  const res = await apiFetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

interface BookingResponse {
  [key: string]: unknown;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
}

function normalizeBooking(b: BookingResponse) {
  return {
    ...b,
    start_time: b.start_time ?? b.startTime,
    end_time: b.end_time ?? b.endTime,
    startTime: b.startTime ?? b.start_time,
    endTime: b.endTime ?? b.end_time,
  };
}

export async function getBookings(opts: { status?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  const query = params.toString();
  const res = await apiFetch(`${API_BASE}/bookings${query ? `?${query}` : ''}`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeBooking) : data;
}

export async function getBookingHistory(
  opts: { status?: string; past?: boolean; userId?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  if (opts.past) params.append('past', 'true');
  if (opts.userId) params.append('userId', String(opts.userId));
  const res = await apiFetch(
    `${API_BASE}/bookings/history?${params.toString()}`,
  );
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeBooking) : data;
}

export async function getHolidays() {
  const res = await apiFetch(`${API_BASE}/holidays`);
  return handleResponse(res);
}

export async function addHoliday(date: string, reason: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/holidays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, reason }),
  });
  await handleResponse(res);
}

export async function removeHoliday(date: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/holidays/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function getAllSlots() {
  const res = await apiFetch(`${API_BASE}/slots/all`);
  const data = await handleResponse(res);
  return data.map((s: any) => ({
    id: String(s.id),
    startTime: s.startTime ?? s.start_time,
    endTime: s.endTime ?? s.end_time,
    available: s.available,
  })) as Slot[];
}

export async function getBlockedSlots(date: string) {
  const res = await apiFetch(`${API_BASE}/blocked-slots?date=${encodeURIComponent(date)}`);
  return handleResponse(res);
}

export async function addBlockedSlot(
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

export async function removeBlockedSlot(date: string, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/blocked-slots/${encodeURIComponent(date)}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function getBreaks() {
  const res = await apiFetch(`${API_BASE}/breaks`);
  return handleResponse(res);
}

export async function addBreak(
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

export async function removeBreak(dayOfWeek: number, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/breaks/${dayOfWeek}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function decideBooking(
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
  rescheduleToken: string,
  slotId: string,
  date: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await apiFetch(`${API_BASE}/bookings/reschedule/${rescheduleToken}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ slotId, date }),
  });
  await handleResponse(res);
}

