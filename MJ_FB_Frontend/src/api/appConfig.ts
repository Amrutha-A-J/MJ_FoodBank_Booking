import { API_BASE, apiFetch, handleResponse } from './client';

export interface AppConfig {
  cartTare: number;
  breadWeightMultiplier: number;
  cansWeightMultiplier: number;
}

export async function getAppConfig(): Promise<AppConfig> {
  const res = await apiFetch(`${API_BASE}/app-config`);
  return handleResponse(res);
}

export async function updateAppConfig(config: AppConfig): Promise<AppConfig> {
  const res = await apiFetch(`${API_BASE}/app-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse(res);
}
