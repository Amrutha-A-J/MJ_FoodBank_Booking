import type { Role, UserRole, StaffRole, UserProfile, StaffAccess } from '../types';
import { API_BASE, apiFetch, handleResponse } from './client';

export interface LoginResponse {
  role: Role;
  name: string;
  bookingsThisMonth?: number;
  userRole?: UserRole;
  access?: StaffAccess[];
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

export async function logout(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
  await handleResponse(res);
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
  _token: string,
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

export async function getUserProfile(_token: string): Promise<UserProfile> {
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
  access: StaffAccess[],
  _token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const res = await apiFetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ firstName, lastName, role, email, password, access }),
  });
  await handleResponse(res);
}

export async function addUser(
  _token: string,
  firstName: string,
  lastName: string,
  clientId: string,
  role: UserRole,
  password: string,
  email?: string,
  phone?: string
): Promise<void> {
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

export async function searchUsers(_token: string, search: string) {
  const res = await apiFetch(`${API_BASE}/users/search?search=${encodeURIComponent(search)}`);
  return handleResponse(res);
}
