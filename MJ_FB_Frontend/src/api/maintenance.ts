import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface Maintenance {
  maintenanceMode: boolean;
  notice?: string;
}

export interface MaintenanceSettings {
  maintenanceMode: boolean;
  upcomingNotice?: string;
}

export async function getMaintenance(): Promise<Maintenance> {
  const res = await apiFetch(`${API_BASE}/maintenance`);
  return handleResponse(res);
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const res = await apiFetch(`${API_BASE}/maintenance/settings`);
  return handleResponse(res);
}

export async function updateMaintenance(settings: Maintenance): Promise<Maintenance> {
  const res = await jsonApiFetch(`${API_BASE}/maintenance`, {
    method: 'PUT',
    body: settings,
  });
  return handleResponse(res);
}

export async function updateMaintenanceSettings(
  settings: MaintenanceSettings,
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/maintenance/settings`, {
    method: 'PUT',
    body: settings,
  });
  await handleResponse(res);
}

export async function clearMaintenance(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/maintenance/stats`, { method: 'DELETE' });
  await handleResponse(res);
}

export async function clearMaintenanceStats(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/maintenance/stats`, { method: 'DELETE' });
  await handleResponse(res);
}
