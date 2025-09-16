import type {
  UserRole,
  UserProfile,
  StaffAccess,
  LoginResponse,
  UserPreferences,
  PasswordResetBody,
} from "../types";
import { API_BASE, apiFetch, handleResponse } from "./client";
export type { LoginResponse } from "../types";

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  const body: Record<string, unknown> = { password };
  const id = Number(identifier);
  if (Number.isInteger(id)) body.clientId = id;
  else body.email = identifier;
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<LoginResponse>(res);
}

export async function logout(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, {
    method: "POST",
  });
  await handleResponse(res);
}

export async function requestPasswordReset(data: PasswordResetBody): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
}

export async function resendPasswordSetup(data: {
  email?: string;
  clientId?: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/resend-password-setup`, {
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

export async function setPassword(
  token: string,
  password: string,
): Promise<string> {
  const res = await apiFetch(`${API_BASE}/auth/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = (await handleResponse(res)) as { loginPath: string };
  return data.loginPath;
}

export interface PasswordSetupInfo {
  userType: string;
  clientId?: number;
  email?: string;
}

export async function getPasswordSetupInfo(
  token: string,
): Promise<PasswordSetupInfo> {
  const res = await apiFetch(
    `${API_BASE}/auth/password-setup-info?token=${encodeURIComponent(token)}`,
  );
  return handleResponse(res);
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`);
  return handleResponse(res);
}

export async function updateMyProfile(data: {
  email?: string;
  phone?: string;
  address?: string | null;
}): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function setUserConsent(consent: boolean): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent }),
  });
  await handleResponse(res);
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

export interface AddUserOptions {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  sendPasswordLink?: boolean;
}

export async function addUser(
  clientId: string,
  role: UserRole,
  onlineAccess: boolean,
  options: AddUserOptions = {},
): Promise<void> {
  const id = Number(clientId);
  if (!Number.isInteger(id)) {
    return Promise.reject(new Error("Invalid client ID"));
  }
  const body: Record<string, unknown> = {
    clientId: id,
    role,
    onlineAccess,
  };
  if (options.firstName) body.firstName = options.firstName;
  if (options.lastName) body.lastName = options.lastName;
  if (options.email) body.email = options.email;
  if (options.phone) body.phone = options.phone;
  if (options.password) body.password = options.password;
  if (options.sendPasswordLink) body.sendPasswordLink = options.sendPasswordLink;

  const res = await apiFetch(`${API_BASE}/users/add-client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  await handleResponse(res);
}

export async function addClientById(clientId: string): Promise<void> {
  const id = Number(clientId);
  if (!Number.isInteger(id)) {
    return Promise.reject(new Error("Invalid client ID"));
  }
  const res = await apiFetch(`${API_BASE}/users/add-client`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: id, role: "shopper", onlineAccess: false }),
  });
  await handleResponse(res);
}

export async function searchUsers(
  search: string,
): Promise<UserSearchResult[]> {
  const res = await apiFetch(
    `${API_BASE}/users/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res);
}

export interface UserSearchResult {
  name: string;
  email: string | null;
  phone: string | null;
  client_id: number;
  hasPassword: boolean;
}

export interface UserByClientId {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  clientId: number;
  onlineAccess: boolean;
  hasPassword: boolean;
}

export async function getUserByClientId(
  clientId: string,
): Promise<UserByClientId> {
  const res = await apiFetch(`${API_BASE}/users/id/${clientId}`);
  return handleResponse(res);
}

export interface IncompleteUser {
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
    password?: string;
  },
): Promise<IncompleteUser> {
  const res = await apiFetch(`${API_BASE}/users/id/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
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

export async function deleteUser(clientId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/id/${clientId}`, { method: 'DELETE' });
  await handleResponse(res);
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await apiFetch(`${API_BASE}/users/me/preferences`);
  return handleResponse(res);
}

export async function updateUserPreferences(
  data: UserPreferences,
): Promise<UserPreferences> {
  const res = await apiFetch(`${API_BASE}/users/me/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

