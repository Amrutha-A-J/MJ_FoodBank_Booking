// src/api/api.ts
// Read API base URL from environment or fall back to localhost
import type {
  Role,
  UserRole,
  StaffRole,
  UserProfile,
  Slot,
  VolunteerRole,
  VolunteerRoleWithShifts,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrfToken='))?.split('=')[1];
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  init.headers = headers;

  let res = await fetch(input, { credentials: 'include', ...init });
  if (res.status === 401) {
    try {
      const data = await res.clone().json();
      if (data?.message === 'Token expired') {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          res = await fetch(input, { credentials: 'include', ...init });
        }
      }
    } catch {
      // ignore
    }
  }
  return res;
}

export interface LoginResponse {
  role: Role;
  name: string;
  bookingsThisMonth?: number;
  userRole?: UserRole;
}

export async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    let data: any = null;
    try {
      data = await res.json();
      message = data.message || data.error || JSON.stringify(data);
    } catch {
      message = await res.text();
    }
    const err: any = new Error(message);
    if (data) err.details = data;
    throw err;
  }
  if (res.status === 204 || res.headers.get('Content-Length') === '0') {
    return undefined;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

export async function loginUser(
  clientId: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: Number(clientId), password }),
  });
  return handleResponse(res);
}

export async function loginStaff(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function loginVolunteer(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(res);
  return data;
}

export async function requestPasswordReset(data: {
  email?: string;
  username?: string;
  clientId?: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await handleResponse(res);
}

export async function getUserProfile(token: string): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`);
  return handleResponse(res);
}

export async function staffExists(): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/staff/exists`);
  const data = (await handleResponse(res)) as { exists?: boolean } | undefined;
  return data?.exists ?? false;
}

export async function createStaff(
  firstName: string,
  lastName: string,
  role: StaffRole,
  email: string,
  password: string,
  token?: string
) : Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const res = await apiFetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ firstName, lastName, role, email, password }),
  });
  await handleResponse(res);
}


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

// api.ts
export async function addUser(
  token: string,
  firstName: string,
  lastName: string,
  clientId: string,
  role: UserRole,
  password: string,
  email?: string,
  phone?: string
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName,
      lastName,
      clientId: Number(clientId),
      role,
      password,
      email,
      phone,
    }),
  });
  await handleResponse(res);
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

export async function getBookings(token: string) {
  const res = await apiFetch(`${API_BASE}/bookings`);
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
    return handleResponse(res); // returns Holiday[]
  }

export async function addHoliday(token: string, date: string, reason: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    body: JSON.stringify({ date, reason })
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
  return handleResponse(res); // returns BlockedSlot[]
}

export async function addBlockedSlot(token: string, date: string, slotId: number, reason: string): Promise<void> {
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
  return handleResponse(res); // returns Break[]
}

export async function addBreak(token: string, dayOfWeek: number, slotId: number, reason: string): Promise<void> {
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

export async function decideBooking(token: string, bookingId: string, decision: 'approve'|'reject', reason: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ decision, reason }),
  });
  await handleResponse(res);
}

export async function cancelBooking(token: string, bookingId: string, reason?: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  await handleResponse(res);
}

export async function searchUsers(token: string, search: string) {
    const res = await apiFetch(`${API_BASE}/users/search?search=${encodeURIComponent(search)}`);
    return handleResponse(res); // returns array of users
  }

export async function searchVolunteers(token: string, search: string) {
  const res = await apiFetch(
    `${API_BASE}/volunteers/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res);
}
  
export async function createBookingForUser(
    token: string,
    userId: number,
    slotId: number,
    date: string,
    isStaffBooking: boolean
  ) : Promise<void> {
    const res = await apiFetch(`${API_BASE}/bookings/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, slotId, date, isStaffBooking })
    });
    await handleResponse(res);
  }

export async function getVolunteerRolesForVolunteer(
  token: string,
  date: string,
): Promise<VolunteerRole[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/mine?date=${date}`);
  return handleResponse(res);
}

export async function requestVolunteerBooking(
  token: string,
  roleId: number,
  date: string
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleId, date }),
  });
  await handleResponse(res);
}

export async function getMyVolunteerBookings(token: string) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/mine`);
  return handleResponse(res);
}

export async function getVolunteerRoles(
  token: string,
): Promise<VolunteerRoleWithShifts[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-roles`);
  return handleResponse(res);
}

export async function getVolunteerMasterRoles(token: string) {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles`);
  return handleResponse(res);
}

export async function updateVolunteerRoleStatus(
  token: string,
  id: number,
  isActive: boolean,
) {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });
  return handleResponse(res);
}

export async function getVolunteerBookingsByRole(token: string, roleId: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${roleId}`);
  return handleResponse(res);
}

export async function updateVolunteerBookingStatus(
  token: string,
  bookingId: number,
  status: 'approved' | 'rejected' | 'cancelled'
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  await handleResponse(res);
}

export async function createVolunteerBookingForVolunteer(
  token: string,
  volunteerId: number,
  roleId: number,
  date: string
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ volunteerId, roleId, date }),
  });
  await handleResponse(res);
}

export async function getVolunteerBookingHistory(token: string, volunteerId: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/volunteer/${volunteerId}`);
  return handleResponse(res);
}

export async function createVolunteer(
  token: string,
  firstName: string,
  lastName: string,
  username: string,
  password: string,
  roleIds: number[],
  email?: string,
  phone?: string
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName,
      lastName,
      username,
      password,
      roleIds,
      email,
      phone,
    }),
  });
  await handleResponse(res);
}

export async function updateVolunteerTrainedAreas(
  token: string,
  id: number,
  roleIds: number[]
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${id}/trained-areas`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleIds }),
  });
  await handleResponse(res);
}
  
export async function rescheduleBookingByToken(
  token: string,
  slotId: string,
  date: string,
  authToken?: string,
) : Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await apiFetch(`${API_BASE}/bookings/reschedule/${token}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ slotId, date }),
  });
  await handleResponse(res);
}

export async function rescheduleVolunteerBookingByToken(
  token: string,
  roleId: number,
  date: string,
) : Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/reschedule/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId, date }),
  });
  await handleResponse(res);
}
