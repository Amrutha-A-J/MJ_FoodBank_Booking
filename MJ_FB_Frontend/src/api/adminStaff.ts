import type { StaffRole } from '../types';
import { API_BASE, apiFetch, handleResponse } from './client';

export interface StaffSummary {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: StaffRole;
}

export async function listStaff(_token: string) {
  const res = await apiFetch(`${API_BASE}/admin/staff`);
  return handleResponse(res) as Promise<StaffSummary[]>;
}

export async function searchStaff(_token: string, search: string) {
  const res = await apiFetch(
    `${API_BASE}/admin/staff/search?search=${encodeURIComponent(search)}`,
  );
  return handleResponse(res) as Promise<StaffSummary[]>;
}

export async function getStaff(_token: string, id: number) {
  const res = await apiFetch(`${API_BASE}/admin/staff/${id}`);
  return handleResponse(res) as Promise<StaffSummary>;
}

export async function createStaff(
  _token: string,
  data: { firstName: string; lastName: string; email: string; role: StaffRole; password: string },
) {
  const res = await apiFetch(`${API_BASE}/admin/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateStaff(
  _token: string,
  id: number,
  data: { firstName: string; lastName: string; email: string; role: StaffRole; password?: string },
) {
  const res = await apiFetch(`${API_BASE}/admin/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteStaff(_token: string, id: number) {
  const res = await apiFetch(`${API_BASE}/admin/staff/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
