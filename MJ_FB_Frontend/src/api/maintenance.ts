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

export interface VacuumResponse {
  message?: string;
}

export interface DeadRowInfo {
  table: string;
  deadRows: number;
}

export interface DeadRowsLookupResponse {
  message?: string;
  tables?: DeadRowInfo[];
}

export interface PurgeRequestPayload {
  tables: string[];
  before: string;
}

export interface PurgedTableSummary {
  table: string;
  months?: string[];
}

export interface PurgeResponse {
  success: boolean;
  cutoff: string;
  purged: PurgedTableSummary[];
}

export async function vacuumDatabase(): Promise<VacuumResponse> {
  const res = await apiFetch(`${API_BASE}/maintenance/vacuum`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function vacuumTable(table: string): Promise<VacuumResponse> {
  const res = await apiFetch(`${API_BASE}/maintenance/vacuum/${encodeURIComponent(table)}`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function getVacuumDeadRows(table?: string): Promise<DeadRowsLookupResponse> {
  const query = table ? `?table=${encodeURIComponent(table)}` : '';
  const res = await apiFetch(`${API_BASE}/maintenance/vacuum/dead-rows${query}`);
  return handleResponse(res);
}

export async function purgeOldRecords(payload: PurgeRequestPayload): Promise<PurgeResponse> {
  const res = await jsonApiFetch(`${API_BASE}/maintenance/purge`, {
    method: 'POST',
    body: payload,
  });
  return handleResponse(res);
}
