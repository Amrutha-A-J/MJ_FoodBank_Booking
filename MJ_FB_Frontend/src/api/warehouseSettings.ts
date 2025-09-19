import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface WarehouseSettings {
  breadWeightMultiplier: number;
  cansWeightMultiplier: number;
}

export async function getWarehouseSettings(): Promise<WarehouseSettings> {
  const res = await apiFetch(`${API_BASE}/warehouse-settings`);
  return handleResponse(res);
}

export async function updateWarehouseSettings(
  settings: WarehouseSettings,
): Promise<WarehouseSettings> {
  const res = await jsonApiFetch(`${API_BASE}/warehouse-settings`, {
    method: 'PUT',
    body: settings,
  });
  return handleResponse(res);
}
