import { API_BASE, apiFetch, handleResponse } from './client';
import type {
  Slot,
  SlotsByDate,
  RecurringBlockedSlot,
  BlockedSlot,
  Break,
  Holiday,
  Booking,
  BookingResponse,
} from '../types';

interface SlotResponse {
  id: number | string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  available: number;
  reason?: string;
  status?: string;
  max_capacity?: number;
  maxCapacity?: number;
}

interface SlotsByDateResponse {
  date: string;
  slots: SlotResponse[];
}

interface CreateBookingBody {
  slotId: number;
  date: string;
  note: string;
  userId?: number;
}

const mapSlot = (s: SlotResponse): Slot => ({
  id: String(s.id),
  startTime: s.startTime ?? s.start_time ?? '',
  endTime: s.endTime ?? s.end_time ?? '',
  available: s.available,
  maxCapacity: s.maxCapacity ?? s.max_capacity,
  reason: s.reason,
  status: s.status,
});

export async function getSlots(date?: string, includePast = false) {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (includePast) params.append('includePast', 'true');
  const query = params.toString();
  const res = await apiFetch(`${API_BASE}/slots${query ? `?${query}` : ''}`);
  const data = await handleResponse<SlotResponse[]>(res);
  return data.map(mapSlot);
}

export async function getSlotsRange(
  start: string,
  days: number,
  includePast = false,
): Promise<SlotsByDate[]> {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (days) params.append('days', String(days));
  if (includePast) params.append('includePast', 'true');
  const query = params.toString();
  const res = await apiFetch(
    `${API_BASE}/slots/range${query ? `?${query}` : ''}`,
  );
  const data = await handleResponse<SlotsByDateResponse[]>(res);
  return data.map(d => ({
    date: d.date,
    slots: d.slots.map(mapSlot),
  }));
}

export async function createBooking(
  slotId: string,
  date: string,
  note: string,
  userId?: number,
) {
  const body: CreateBookingBody = {
    slotId: Number(slotId),
    date,
    note,
  };
  if (note) body.note = note;
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

function normalizeBooking(b: BookingResponse): Booking {
  const { new_client_id, note, ...rest } = b;
  const newClientId = b.newClientId ?? new_client_id ?? null;
  return {
    ...rest,
    note: note ?? null,
    start_time: b.start_time ?? b.startTime ?? null,
    end_time: b.end_time ?? b.endTime ?? null,
    startTime: b.startTime ?? b.start_time ?? null,
    endTime: b.endTime ?? b.end_time ?? null,
    newClientId,
  };
}

export async function getBookings(
  opts: { status?: string; date?: string; clientIds?: number[] } = {},
): Promise<Booking[] | Booking> {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  if (opts.date) params.append('date', opts.date);
  if (opts.clientIds && opts.clientIds.length)
    params.append('clientIds', opts.clientIds.join(','));
  const query = params.toString();
  const res = await apiFetch(`${API_BASE}/bookings${query ? `?${query}` : ''}`);
  const data = await handleResponse<BookingResponse[] | BookingResponse>(res);
  return Array.isArray(data) ? data.map(normalizeBooking) : normalizeBooking(data);
}

export async function getBookingHistory(
  opts: {
    status?: string;
    past?: boolean;
    userId?: number;
    includeVisits?: boolean;
    includeStaffNotes?: boolean;
    clientIds?: number[];
    limit?: number;
    offset?: number;
  } = {},
): Promise<Booking[] | Booking> {
  const params = new URLSearchParams();
  if (opts.status) params.append('status', opts.status);
  if (opts.past) params.append('past', 'true');
  if (opts.userId) params.append('userId', String(opts.userId));
  if (opts.includeVisits) params.append('includeVisits', 'true');
  if (opts.includeStaffNotes) params.append('includeStaffNotes', 'true');
  if (opts.clientIds && opts.clientIds.length)
    params.append('clientIds', opts.clientIds.join(','));
  if (typeof opts.limit === 'number')
    params.append('limit', String(opts.limit));
  if (typeof opts.offset === 'number')
    params.append('offset', String(opts.offset));
  const res = await apiFetch(
    `${API_BASE}/bookings/history?${params.toString()}`,
  );
  const data = await handleResponse<BookingResponse[] | BookingResponse>(res);
  return Array.isArray(data) ? data.map(normalizeBooking) : normalizeBooking(data);
}

export async function getHolidays() {
  const res = await apiFetch(`${API_BASE}/holidays`);
  return handleResponse<Holiday[]>(res);
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

export async function getBlockedSlots(date?: string): Promise<BlockedSlot[]> {
  const url = date
    ? `${API_BASE}/blocked-slots?date=${encodeURIComponent(date)}`
    : `${API_BASE}/blocked-slots`;
  const res = await apiFetch(url);
  return handleResponse<BlockedSlot[]>(res);
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
  await handleResponse<void>(res);
}

export async function removeBlockedSlot(date: string, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/blocked-slots/${encodeURIComponent(date)}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(res);
}

export async function getRecurringBlockedSlots(): Promise<RecurringBlockedSlot[]> {
  const res = await apiFetch(`${API_BASE}/recurring-blocked-slots`);
  return handleResponse<RecurringBlockedSlot[]>(res);
}

export async function addRecurringBlockedSlot(
  dayOfWeek: number,
  weekOfMonth: number,
  slotId: number,
  reason: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/recurring-blocked-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dayOfWeek, weekOfMonth, slotId, reason }),
  });
  await handleResponse<void>(res);
}

export async function removeRecurringBlockedSlot(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/recurring-blocked-slots/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(res);
}

export async function getBreaks() {
  const res = await apiFetch(`${API_BASE}/breaks`);
  return handleResponse<Break[]>(res);
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
  await handleResponse<void>(res);
}

export async function removeBreak(dayOfWeek: number, slotId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/breaks/${dayOfWeek}/${slotId}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(res);
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
  await handleResponse<void>(res);
}

export async function markBookingNoShow(
  bookingId: number,
  reason?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/no-show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  await handleResponse<void>(res);
}

export async function markBookingVisited(
  bookingId: number,
  requestData?: string,
  note?: string,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (requestData) body.requestData = requestData;
  if (note) body.note = note;
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/visited`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await handleResponse<void>(res);
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
  await handleResponse<void>(res);
}

export async function createBookingForNewClient(
  name: string,
  slotId: number,
  date: string,
  email?: string,
  phone?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/new-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, slotId, date }),
  });
  await handleResponse<void>(res);
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
  await handleResponse<void>(res);
}

