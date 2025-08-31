import { API_BASE, apiFetch, handleResponse } from './client';
import type {
  VolunteerRole,
  VolunteerRoleWithShifts,
  RoleOption,
  Shift,
  VolunteerBooking,
  VolunteerBookingStatus,
  VolunteerRecurringBooking,
  UserProfile,
  RecurringVolunteerBooking,
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
  const data = await handleResponse(res);
  return data.map((r: any) => ({
    ...r,
    date: r.date?.split('T')[0] ?? r.date,
  }));
}

export async function requestVolunteerBooking(
  roleId: number,
  date: string
): Promise<VolunteerBooking> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleId, date }),
  });
  const data = await handleResponse(res);
  return normalizeVolunteerBooking(data);
}

export async function resolveVolunteerBookingConflict(
  existingBookingId: number,
  roleId: number,
  date: string,
  keep: 'existing' | 'new'
): Promise<VolunteerBooking> {
  const body: any = { existingBookingId, keep };
  if (roleId !== undefined) body.roleId = roleId;
  if (date !== undefined) body.date = date;
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/resolve-conflict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await handleResponse(res);
  return normalizeVolunteerBooking(data.booking);
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

export async function getRecurringVolunteerBookings(): Promise<
  VolunteerRecurringBooking[]
> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/recurring`);
  return handleResponse(res);
}

export async function cancelVolunteerBooking(
  bookingId: number,
  reason = 'volunteer_cancelled',
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/${bookingId}/cancel`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    },
  );
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

export async function getMyRecurringVolunteerBookings(): Promise<
  RecurringVolunteerBooking[]
> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/recurring`);
  return handleResponse<RecurringVolunteerBooking[]>(res);
}

export async function getMyVolunteerBookings() {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/mine`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerRoles(
  includeInactive = false,
): Promise<VolunteerRoleWithShifts[]> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-roles${includeInactive ? '?includeInactive=true' : ''}`,
  );
  return handleResponse(res);
}

export async function getVolunteerMasterRoles() {
  const res = await apiFetch(`${API_BASE}/volunteer-master-roles`);
  return handleResponse(res);
}

export async function restoreVolunteerRoles() {
  const res = await apiFetch(`${API_BASE}/volunteer-roles/restore`, {
    method: 'POST',
  });
  await handleResponse(res);
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

export async function createVolunteerRole(
  roleId: number | undefined,
  name: string | undefined,
  categoryId: number | undefined,
  startTime: string,
  endTime: string,
  maxVolunteers: number,
  isWednesdaySlot?: boolean,
  isActive?: boolean,
) {
  const body: Record<string, unknown> = {
    startTime,
    endTime,
    maxVolunteers,
    isWednesdaySlot,
    isActive,
  };
  if (typeof roleId === 'number') {
    body.roleId = roleId;
  } else {
    body.name = name;
    body.categoryId = categoryId;
  }
  const res = await apiFetch(`${API_BASE}/volunteer-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

export async function getUnmarkedVolunteerBookings(): Promise<VolunteerBooking[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/unmarked`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerBookingsForReview(
  start: string,
  end: string,
): Promise<VolunteerBooking[]> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/review?start=${start}&end=${end}`,
  );
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function updateVolunteerBookingStatus(
  bookingId: number,
  status: VolunteerBookingStatus,
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
  date: string,
  force = false,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ volunteerId, roleId, date, force }),
  });
  await handleResponse(res);
}

export async function createRecurringVolunteerBookingForVolunteer(
  volunteerId: number,
  roleId: number,
  startDate: string,
  frequency: 'daily' | 'weekly',
  weekdays?: number[],
  endDate?: string,
) {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/recurring/staff`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        volunteerId,
        roleId,
        startDate,
        pattern: frequency,
        daysOfWeek: weekdays,
        endDate,
      }),
    },
  );
  const data = await handleResponse(res);
  return {
    ...(data || {}),
    successes: (data?.successes ?? []).map(normalizeVolunteerBooking),
  };
}

export async function getRecurringVolunteerBookingsForVolunteer(
  volunteerId: number,
): Promise<VolunteerRecurringBooking[]> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/recurring/volunteer/${volunteerId}`,
  );
  return handleResponse(res);
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
  email?: string,
  phone?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${volunteerId}/shopper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: Number(clientId),
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

export interface VolunteerStats {
  badges: string[];
  lifetimeHours: number;
  monthHours: number;
  totalShifts: number;
  currentStreak: number;
  milestone: number | null;
  milestoneText: string | null;
  familiesServed: number;
  poundsHandled: number;
  /** Families served in the current month */
  monthFamiliesServed: number;
  /** Pounds handled in the current month */
  monthPoundsHandled: number;
}

export interface VolunteerGroupStats {
  totalHours: number;
  monthHours: number;
  monthHoursGoal: number;
  totalLbs: number;
  weekLbs: number;
  monthLbs: number;
  monthFamilies: number;
}

export async function getVolunteerStats(): Promise<VolunteerStats> {
  const res = await apiFetch(`${API_BASE}/volunteers/me/stats`);
  return handleResponse(res);
}

export async function getVolunteerBadges(): Promise<string[]> {
  const data = await getVolunteerStats();
  return data.badges ?? [];
}

export async function getVolunteerLeaderboard(): Promise<{ rank: number; percentile: number }> {
  const res = await apiFetch(`${API_BASE}/volunteer-stats/leaderboard`);
  return handleResponse(res);
}

export async function getVolunteerGroupStats(): Promise<VolunteerGroupStats> {
  const res = await apiFetch(`${API_BASE}/volunteer-stats/group`);
  return handleResponse(res);
}

export interface VolunteerRanking {
  id: number;
  name: string;
  total: number;
}

export async function getVolunteerRankings(
  roleId?: number,
): Promise<VolunteerRanking[]> {
  const url = `${API_BASE}/volunteer-stats/ranking${
    roleId ? `?roleId=${roleId}` : ''
  }`;
  const res = await apiFetch(url);
  return handleResponse(res);
}

export interface VolunteerNoShowRanking {
  id: number;
  name: string;
  totalBookings: number;
  noShows: number;
  noShowRate: number;
}

export async function getVolunteerNoShowRanking(): Promise<VolunteerNoShowRanking[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-stats/no-show-ranking`);
  return handleResponse(res);
}

export async function awardVolunteerBadge(badgeCode: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/me/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badgeCode }),
  });
  await handleResponse(res);
}
