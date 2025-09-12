import { API_BASE, apiFetch, handleResponse } from './client';

export interface MaintenanceSettings {
  maintenanceMode: boolean;
  upcomingNotice: string;
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const res = await apiFetch(`${API_BASE}/maintenance`);
  return handleResponse(res);
}

export async function updateMaintenanceSettings(settings: MaintenanceSettings): Promise<MaintenanceSettings> {
  const res = await apiFetch(`${API_BASE}/maintenance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function clearMaintenanceStats(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/maintenance/stats`, { method: 'DELETE' });
  await handleResponse(res);
}
