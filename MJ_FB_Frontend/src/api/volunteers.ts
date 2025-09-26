import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
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
  BookingActionResponse,
  RawVolunteerBooking,
  VolunteerBookingRequest,
  ResolveVolunteerBookingConflictRequest,
} from '../types';
import type { LoginResponse } from './users';

function normalizeVolunteerBooking(b: RawVolunteerBooking): VolunteerBooking {
  return {
    ...b,
    note: b.note ?? null,
    date: b.date?.split('T')[0] ?? b.date,
    start_time: (b.start_time ?? b.startTime) as string,
    end_time: (b.end_time ?? b.endTime) as string,
    startTime: (b.startTime ?? b.start_time) as string,
    endTime: (b.endTime ?? b.end_time) as string,
  };
}

export async function loginVolunteer(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await jsonApiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  const data = await handleResponse(res);
  return data;
}

export async function getVolunteerProfile(): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/volunteers/me`);
  return handleResponse(res);
}

export interface VolunteerSearchResult {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  trainedAreas: number[];
  hasShopper: boolean;
  hasPassword: boolean;
  clientId: number | null;
}

export async function getVolunteerById(
  id: number,
): Promise<VolunteerSearchResult> {
  const res = await apiFetch(`${API_BASE}/volunteers/${id}`);
  return handleResponse(res);
}

export interface VolunteerMostBookedRole {
  roleId: number;
  roleName: string;
  shifts: number;
  hours: number;
}

export interface VolunteerLastCompletedShift {
  date: string;
  roleId: number;
  roleName: string;
  hours: number;
}

export interface VolunteerStatsByIdResponse {
  volunteerId: number;
  lifetime: { hours: number; shifts: number };
  yearToDate: { hours: number; shifts: number };
  monthToDate: { hours: number; shifts: number };
  mostBookedRoles: VolunteerMostBookedRole[];
  lastCompletedShift: VolunteerLastCompletedShift | null;
}

export async function getVolunteerStatsById(
  id: number,
): Promise<VolunteerStatsByIdResponse> {
  const res = await apiFetch(`${API_BASE}/volunteers/${id}/stats`);
  return handleResponse(res);
}

export async function searchVolunteers(
  search: string,
): Promise<VolunteerSearchResult[]> {
  const res = await apiFetch(
    `${API_BASE}/volunteers/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res);
}

export async function updateVolunteer(
  id: number,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    onlineAccess?: boolean;
    password?: string;
    sendPasswordLink?: boolean;
  },
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/volunteers/${id}`, {
    method: 'PUT',
    body: data,
  });
  await handleResponse(res);
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
  const data = await handleResponse<VolunteerRole[]>(res);
  return data.map(r => ({
    ...r,
    date: r.date?.split('T')[0] ?? r.date,
  }));
}

export async function requestVolunteerBooking(
  roleId: number,
  date: string,
  note?: string,
): Promise<BookingActionResponse> {
  const body: VolunteerBookingRequest = { roleId, date, type: 'volunteer shift' };
  if (note && note.trim()) body.note = note;
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings`, {
    method: 'POST',
    body,
  });
  return handleResponse<BookingActionResponse>(res);
}

export async function resolveVolunteerBookingConflict(
  existingBookingId: number,
  roleId: number,
  date: string,
  keep: 'existing' | 'new'
): Promise<VolunteerBooking> {
  const body: ResolveVolunteerBookingConflictRequest = {
    existingBookingId,
    keep,
    type: 'volunteer shift',
  };
  if (roleId !== undefined) body.roleId = roleId;
  if (date !== undefined) body.date = date;
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings/resolve-conflict`, {
    method: 'POST',
    body,
  });
  const data = await handleResponse<{ booking: RawVolunteerBooking }>(res);
  return normalizeVolunteerBooking(data.booking);
}

export async function createRecurringVolunteerBooking(
  roleId: number,
  startDate: string,
  frequency: 'daily' | 'weekly',
  weekdays?: number[],
  endDate?: string,
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings/recurring`, {
    method: 'POST',
    body: {
      roleId,
      startDate,
      pattern: frequency,
      daysOfWeek: weekdays,
      endDate,
      type: 'volunteer shift',
    },
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
): Promise<BookingActionResponse> {
  const res = await jsonApiFetch(
    `${API_BASE}/volunteer-bookings/${bookingId}/cancel`,
    {
      method: 'PATCH',
      body: { reason, type: 'volunteer shift' },
    },
  );
  return handleResponse<BookingActionResponse>(res);
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
  const res = await jsonApiFetch(`${API_BASE}/volunteer-master-roles`, {
    method: 'POST',
    body: { name },
  });
  return handleResponse(res);
}

export async function updateVolunteerMasterRole(id: number, name: string) {
  const res = await jsonApiFetch(`${API_BASE}/volunteer-master-roles/${id}`, {
    method: 'PUT',
    body: { name },
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
  const res = await jsonApiFetch(`${API_BASE}/volunteer-roles`, {
    method: 'POST',
    body,
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
  const res = await jsonApiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PUT',
    body: {
      name,
      startTime,
      endTime,
      maxVolunteers,
      categoryId,
      isWednesdaySlot,
    },
  });
  return handleResponse(res);
}

export async function toggleVolunteerRole(id: number, isActive: boolean) {
  const res = await jsonApiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PATCH',
    body: { isActive },
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
  const res = await jsonApiFetch(`${API_BASE}/volunteer-roles/${id}`, {
    method: 'PATCH',
    body: { isActive },
  });
  return handleResponse(res);
}

export async function getVolunteerBookingsByRole(roleId: number) {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/${roleId}`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerBookingsByRoles(
  roleIds: number[],
) {
  const params = roleIds.join(',');
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings?roleIds=${params}`,
  );
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerBookings(): Promise<VolunteerBooking[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getVolunteerBookingsByDate(
  date: string,
): Promise<VolunteerBooking[]> {
  const res = await apiFetch(
    `${API_BASE}/volunteer-bookings/by-date?date=${date}`,
  );
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function getUnmarkedVolunteerBookings(): Promise<VolunteerBooking[]> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/unmarked`);
  const data = await handleResponse(res);
  return Array.isArray(data) ? data.map(normalizeVolunteerBooking) : data;
}

export async function updateVolunteerBookingStatus(
  bookingId: number,
  status: VolunteerBookingStatus,
  reason?: string,
): Promise<void> {
  const body = reason ? { status, reason } : { status };
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings/${bookingId}`, {
    method: 'PATCH',
    body,
  });
  await handleResponse(res);
}

export async function createVolunteerBookingForVolunteer(
  volunteerId: number,
  roleId: number,
  date: string,
  force = false,
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings/staff`, {
    method: 'POST',
    body: { volunteerId, roleId, date, force },
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
  const res = await jsonApiFetch(
    `${API_BASE}/volunteer-bookings/recurring/staff`,
    {
      method: 'POST',
      body: {
        volunteerId,
        roleId,
        startDate,
        pattern: frequency,
        daysOfWeek: weekdays,
        endDate,
      },
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
  roleIds: number[],
  onlineAccess: boolean,
  email?: string,
  phone?: string,
  password?: string,
  sendPasswordLink?: boolean,
): Promise<void> {
  const body: any = {
    firstName,
    lastName,
    roleIds,
    onlineAccess,
    email,
    phone,
  };
  if (password !== undefined) body.password = password;
  if (sendPasswordLink !== undefined) body.sendPasswordLink = sendPasswordLink;
  const res = await jsonApiFetch(`${API_BASE}/volunteers`, {
    method: 'POST',
    body,
  });
  await handleResponse(res);
}

export async function updateVolunteerTrainedAreas(
  id: number,
  roleIds: number[]
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/volunteers/${id}/trained-areas`, {
    method: 'PUT',
    body: { roleIds },
  });
  await handleResponse(res);
}

export async function rescheduleVolunteerBookingByToken(
  rescheduleToken: string,
  roleId: number,
  date: string,
): Promise<BookingActionResponse> {
  const res = await jsonApiFetch(`${API_BASE}/volunteer-bookings/reschedule/${rescheduleToken}`, {
    method: 'POST',
    body: { roleId, date },
  });
  return handleResponse<BookingActionResponse>(res);
}

export async function validateVolunteerRescheduleToken(
  rescheduleToken: string,
): Promise<BookingActionResponse> {
  const res = await apiFetch(`${API_BASE}/volunteer-bookings/reschedule/${rescheduleToken}`);
  return handleResponse<BookingActionResponse>(res);
}

export async function createVolunteerShopperProfile(
  volunteerId: number,
  clientId: string,
  email?: string,
  phone?: string,
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/volunteers/${volunteerId}/shopper`, {
    method: 'POST',
    body: {
      clientId: Number(clientId),
      email,
      phone,
    },
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

export async function deleteVolunteer(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/volunteers/${id}`, { method: 'DELETE' });
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
  const res = await jsonApiFetch(`${API_BASE}/volunteers/me/badges`, {
    method: 'POST',
    body: { badgeCode },
  });
  await handleResponse(res);
}
