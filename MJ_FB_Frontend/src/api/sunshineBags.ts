import { API_BASE, apiFetch, handleResponse } from './client';
import type { SunshineBag } from '../types';

export async function getSunshineBag(date: string): Promise<SunshineBag | null> {
  const res = await apiFetch(`${API_BASE}/sunshine-bags?date=${encodeURIComponent(date)}`);
  return handleResponse(res);
}

export async function saveSunshineBag(payload: SunshineBag): Promise<SunshineBag> {
  const res = await apiFetch(`${API_BASE}/sunshine-bags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
