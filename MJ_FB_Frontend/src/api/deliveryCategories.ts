import { API_BASE, apiFetch, handleResponse } from './client';

export interface DeliveryCategoryItem {
  id: number;
  name: string;
}

export interface DeliveryCategory {
  id: number;
  name: string;
  maxItems: number;
  items: DeliveryCategoryItem[];
}

interface DeliveryCategoryPayload {
  name: string;
  maxItems: number;
}

interface DeliveryCategoryItemPayload {
  name: string;
}

export async function getDeliveryCategories(): Promise<DeliveryCategory[]> {
  const res = await apiFetch(`${API_BASE}/delivery/categories`);
  return handleResponse(res);
}

export async function createDeliveryCategory(
  payload: DeliveryCategoryPayload,
): Promise<DeliveryCategory> {
  const res = await apiFetch(`${API_BASE}/delivery/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateDeliveryCategory(
  id: number,
  payload: DeliveryCategoryPayload,
): Promise<DeliveryCategory> {
  const res = await apiFetch(`${API_BASE}/delivery/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteDeliveryCategory(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/delivery/categories/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function createDeliveryCategoryItem(
  categoryId: number,
  payload: DeliveryCategoryItemPayload,
): Promise<DeliveryCategoryItem> {
  const res = await apiFetch(`${API_BASE}/delivery/categories/${categoryId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateDeliveryCategoryItem(
  categoryId: number,
  itemId: number,
  payload: DeliveryCategoryItemPayload,
): Promise<DeliveryCategoryItem> {
  const res = await apiFetch(`${API_BASE}/delivery/categories/${categoryId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteDeliveryCategoryItem(
  categoryId: number,
  itemId: number,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/delivery/categories/${categoryId}/items/${itemId}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}
