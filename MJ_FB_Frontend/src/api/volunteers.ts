import { API_BASE, apiFetch, handleResponse } from './client';
import type {
  VolunteerRole,
  VolunteerRoleWithShifts,
  RoleOption,
  Shift,
  VolunteerBooking,
  UserProfile,
} from '../types';
import type { LoginResponse } from './users';

function normalizeVolunteerBooking(b: any): VolunteerBooking {
  return {
    ...b,
    date: b.date?.split('T')[0] ?? b.date,
    start_time: b.start_time ?? b.startTime,
    end_time: b.end_time ?? b.endTime,
    startTime: b.startTime ?? b.start_time,
    endTime: b.endTime ?? b.end_time,
  };
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

export async function getVolunteerProfile(): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/volunteers/me`);
  return handleResponse(res);
}

export async function searchVolunteers(search: string) {
  const res = await apiFetch(
    `${API_BASE}/volunteers/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res);
}

export async function getRoles(): Promise<RoleOption[]> {
  const res = await apiFetch(`${API_BASE}/api/roles`);
  return handleResponse(res);
}

export async function getRoleShifts(roleId: number): Promise<Shift[]> {
  const res = await apiFetch(`${API_BASE}/api/roles/${roleId}/shifts`);
  return handleResponse(res);
}

export async function getVolunteerRolesForVolunteer(
  date: string,
): Promise<VolunteerRole[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/mine?date=${date}`);
  return handleResponse(res);
}

export async function requestVolunteerBooking(
  roleId: number,
  date: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleId, date }),
  });
  await handleResponse(res);
}

export async function createRecurringVolunteerBooking(
  roleId: number,
  startDate: string,
  frequency: 'daily' | 'weekly',
  weekdays?: number[],
  endDate?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roleId,
      startDate,
      pattern: frequency,
      daysOfWeek: weekdays,
      endDate,
    }),
  });
  await handleResponse(res);
}

export async function cancelVolunteerBooking(
  bookingId: number,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${bookingId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function cancelRecurringVolunteerBooking(
  recurringId: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/recurring/${recurringId}`,
    {
      method: 'DELETE',
    },
  );
  await handleResponse(res);
}

export async function getMyVolunteerBookings() {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/mine`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerRoles(): Promise<VolunteerRoleWithShifts[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-roles`);
  return handleResponse(res);
}

export async function getVolunteerMasterRoles() {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles`);
  return handleResponse(res);
}

export async function createVolunteerMasterRole(name: string) {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function updateVolunteerMasterRole(id: number, name: string) {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function deleteVolunteerMasterRole(id: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function createVolunteerRole({
  name,
  roleId,
  startTime,
  endTime,
  maxVolunteers,
  categoryId,
  isWednesdaySlot,
  isActive,
}: {
  name?: string;
  roleId?: number;
  startTime: string;
  endTime: string;
  maxVolunteers: number;
  categoryId?: number;
  isWednesdaySlot?: boolean;
  isActive?: boolean;
}) {
  const res = await apiFetch(`${API_BASE}/volunteer-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      roleId,
      startTime,
      endTime,
      maxVolunteers,
      categoryId,
      isWednesdaySlot,
      isActive,
    }),
  });
  return handleResponse(res);
}

export async function updateVolunteerRole(
  id: number,
  {
    name,
    startTime,
    endTime,
    maxVolunteers,
    categoryId,
    isWednesdaySlot,
  }: {
    name: string;
    startTime: string;
    endTime: string;
    maxVolunteers: number;
    categoryId: number;
    isWednesdaySlot?: boolean;
  },
) {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      startTime,
      endTime,
      maxVolunteers,
      categoryId,
      isWednesdaySlot,
    }),
  });
  return handleResponse(res);
}

export async function toggleVolunteerRole(id: number, isActive: boolean) {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  return handleResponse(res);
}

export async function deleteVolunteerRole(id: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function updateVolunteerRoleStatus(
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

export async function getVolunteerBookingsByRole(roleId: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${roleId}`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function updateVolunteerBookingStatus(
  bookingId: number,
  status: 'approved' | 'rejected' | 'cancelled' | 'no_show' | 'expired',
  reason?: string,
): Promise<void> {
  const body = reason ? { status, reason } : { status };
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  await handleResponse(res);
}

export async function createVolunteerBookingForVolunteer(
  volunteerId: number,
  roleId: number,
  date: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ volunteerId, roleId, date }),
  });
  await handleResponse(res);
}

export async function getVolunteerBookingHistory(
  volunteerId: number,
) {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/volunteer/${volunteerId}`,
  );
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function createVolunteer(
  firstName: string,
  lastName: string,
  username: string,
  password: string,
  roleIds: number[],
  email?: string,
  phone?: string
): Promise<void> {
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
  id: number,
  roleIds: number[]
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${id}/trained-areas`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleIds }),
  });
  await handleResponse(res);
}

export async function rescheduleVolunteerBookingByToken(
  rescheduleToken: string,
  roleId: number,
  date: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/reschedule/${rescheduleToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId, date }),
  });
  await handleResponse(res);
}

export async function createVolunteerShopperProfile(
  volunteerId: number,
  clientId: string,
  password: string,
  email?: string,
  phone?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${volunteerId}/shopper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: Number(clientId),
      password,
      email,
      phone,
    }),
  });
  await handleResponse(res);
}

export async function removeVolunteerShopperProfile(
  volunteerId: number,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${volunteerId}/shopper`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}
