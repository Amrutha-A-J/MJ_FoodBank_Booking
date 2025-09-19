import type { Staff, StaffAccess } from '../types';
import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export async function listStaff(): Promise<Staff[]> {
  const res = await apiFetch(`${API_BASE}/admin-staff`);
  return handleResponse(res);
}

export async function getStaff(id: number): Promise<Staff> {
  const res = await apiFetch(`${API_BASE}/admin-staff/${id}`);
  return handleResponse(res);
}

export async function searchStaff(query: string): Promise<Staff[]> {
  const res = await apiFetch(
    `${API_BASE}/admin-staff/search?search=${encodeURIComponent(query)}`,
  );
  return handleResponse(res);
}

export async function createStaff(
  firstName: string,
  lastName: string,
  email: string,
  access: StaffAccess[],
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/admin-staff`, {
    method: 'POST',
    body: { firstName, lastName, email, access },
  });
  await handleResponse(res);
}

export async function updateStaff(
  id: number,
  firstName: string,
  lastName: string,
  email: string,
  access: StaffAccess[],
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/admin-staff/${id}`, {
    method: 'PUT',
    body: { firstName, lastName, email, access },
  });
  await handleResponse(res);
}

export async function deleteStaff(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/admin-staff/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}
