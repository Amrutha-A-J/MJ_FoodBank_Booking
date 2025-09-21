import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
import type {
  CreateDeliveryOrderPayload,
  DeliveryOrder,
  DeliveryOutstandingOrder,
} from '../types';

export async function getOutstandingDeliveryOrders(): Promise<DeliveryOutstandingOrder[]> {
  const res = await apiFetch(`${API_BASE}/delivery/orders/outstanding`);
  return handleResponse<DeliveryOutstandingOrder[]>(res);
}

export async function markDeliveryOrderCompleted(orderId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/delivery/orders/${orderId}/complete`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function createDeliveryOrder(
  payload: CreateDeliveryOrderPayload,
): Promise<DeliveryOrder> {
  const res = await jsonApiFetch(`${API_BASE}/delivery/orders`, {
    method: 'POST',
    body: { ...payload, selections: payload.selections ?? [] },
  });
  return handleResponse<DeliveryOrder>(res);
}

export async function getDeliveryOrdersForClient(
  clientId: number,
): Promise<DeliveryOrder[]> {
  const params = new URLSearchParams({
    clientId: String(clientId),
  });
  const res = await apiFetch(`${API_BASE}/delivery/orders?${params.toString()}`);
  return handleResponse<DeliveryOrder[]>(res);
}
