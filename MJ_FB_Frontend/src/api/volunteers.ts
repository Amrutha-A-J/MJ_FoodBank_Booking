import { API_BASE, apiFetch, handleResponse } from './client';
import type { VolunteerRole, VolunteerRoleWithShifts } from '../types';
import type { LoginResponse } from './users';

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

export async function searchVolunteers(search: string) {
  const res = await apiFetch(
    `${API_BASE}/volunteers/search?search=${encodeURIComponent(search)}`,
  );
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

export async function getMyVolunteerBookings() {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/mine`);
  return handleResponse(res);
}

export async function getVolunteerRoles(
): Promise<VolunteerRoleWithShifts[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-roles`);
  return handleResponse(res);
}

export async function getVolunteerMasterRoles() {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles`);
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
  return handleResponse(res);
}

export async function updateVolunteerBookingStatus(
  bookingId: number,
  status: 'approved' | 'rejected' | 'cancelled'
): Promise<void> {
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

export async function getVolunteerBookingHistory(volunteerId: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/volunteer/${volunteerId}`);
  return handleResponse(res);
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
  token: string,
  roleId: number,
  date: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/reschedule/${token}`, {
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
