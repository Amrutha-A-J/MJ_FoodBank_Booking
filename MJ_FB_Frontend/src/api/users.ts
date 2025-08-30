import type {
  UserRole,
  UserProfile,
  StaffAccess,
  LoginResponse,
} from "../types";
import { API_BASE, apiFetch, handleResponse } from "./client";
export type { LoginResponse } from "../types";

export async function loginUser(
  clientId: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: Number(clientId), password }),
  });
  return handleResponse(res);
}

export async function loginStaff(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function loginAgency(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function logout(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, {
    method: "POST",
  });
  await handleResponse(res);
}

export async function requestPasswordReset(data: {
  email?: string;
  username?: string;
  clientId?: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await handleResponse(res);
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`);
  return handleResponse(res);
}

export async function updateMyProfile(data: {
  email?: string;
  phone?: string;
}): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
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
  access: StaffAccess[],
  email: string,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const res = await apiFetch(`${API_BASE}/staff`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      access,
    }),
  });
  await handleResponse(res);
}

export async function addUser(
  firstName: string,
  lastName: string,
  clientId: string,
  role: UserRole,
  onlineAccess: boolean,
  email?: string,
  phone?: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/add-client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName,
      lastName,
      clientId: Number(clientId),
      role,
      onlineAccess,
      email,
      phone,
    }),
  });
  await handleResponse(res);
}

export async function searchUsers(search: string) {
  const res = await apiFetch(
    `${API_BASE}/users/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res);
}

export async function getUserByClientId(clientId: string) {
  const res = await apiFetch(`${API_BASE}/users/id/${clientId}`);
  return handleResponse(res);
}

export interface IncompleteUser {
  id: number;
  clientId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  profileLink: string;
}

export async function getIncompleteUsers(): Promise<IncompleteUser[]> {
  const res = await apiFetch(`${API_BASE}/users/missing-info`);
  return handleResponse(res);
}

export async function updateUserInfo(
  clientId: number,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    onlineAccess: boolean;
  },
): Promise<IncompleteUser> {
  const res = await apiFetch(`${API_BASE}/users/id/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function sendRegistrationOtp(
  clientId: string,
  email: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/register/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: Number(clientId), email }),
  });
  await handleResponse(res);
}

export async function registerUser(data: {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  otp: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: Number(data.clientId),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      otp: data.otp,
    }),
  });
  await handleResponse(res);
}

export interface NewClient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export async function getNewClients(): Promise<NewClient[]> {
  const res = await apiFetch(`${API_BASE}/new-clients`);
  return handleResponse(res);
}

export async function deleteNewClient(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/new-clients/${id}`, { method: "DELETE" });
  await handleResponse(res);
}
