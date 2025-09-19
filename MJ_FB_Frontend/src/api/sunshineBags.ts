import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
import type { SunshineBag } from '../types';

export async function getSunshineBag(date: string): Promise<SunshineBag | null> {
  const res = await apiFetch(`${API_BASE}/sunshine-bags?date=${encodeURIComponent(date)}`);
  return handleResponse(res);
}

export async function saveSunshineBag(payload: SunshineBag): Promise<SunshineBag> {
  const res = await jsonApiFetch(`${API_BASE}/sunshine-bags`, {
    method: 'POST',
    body: payload,
  });
  return handleResponse(res);
}
