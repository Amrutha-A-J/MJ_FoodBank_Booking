import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface AppConfig {
  cartTare: number;
}

export async function getAppConfig(): Promise<AppConfig> {
  const res = await apiFetch(`${API_BASE}/app-config`);
  return handleResponse(res);
}

export async function updateAppConfig(config: AppConfig): Promise<AppConfig> {
  const res = await jsonApiFetch(`${API_BASE}/app-config`, {
    method: 'PUT',
    body: config,
  });
  return handleResponse(res);
}
