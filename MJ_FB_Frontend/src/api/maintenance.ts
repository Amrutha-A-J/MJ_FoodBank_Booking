import { API_BASE, apiFetch, handleResponse } from './client';

export interface Maintenance {
  maintenanceMode: boolean;
  notice?: string;
}

export async function getMaintenance(): Promise<Maintenance> {
  const res = await apiFetch(`${API_BASE}/maintenance`);
  return handleResponse(res);
}

export async function updateMaintenance(settings: Maintenance): Promise<Maintenance> {
  const res = await apiFetch(`${API_BASE}/maintenance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function clearMaintenance(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/maintenance/stats`, { method: 'DELETE' });
  await handleResponse(res);
}
