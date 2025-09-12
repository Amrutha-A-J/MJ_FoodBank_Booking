import { API_BASE, apiFetch, handleResponse } from './client';

export interface MaintenanceStatus {
  maintenanceMode: boolean;
  notice?: string | null;
}

export async function getMaintenance(): Promise<MaintenanceStatus> {
  const res = await apiFetch(`${API_BASE}/maintenance`);
  return handleResponse(res);
}

export async function updateMaintenance(status: MaintenanceStatus): Promise<MaintenanceStatus> {
  const res = await apiFetch(`${API_BASE}/maintenance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(status),
  });
  return handleResponse(res);
}

export async function clearMaintenance(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/maintenance`, { method: 'DELETE' });
  await handleResponse(res);
}
