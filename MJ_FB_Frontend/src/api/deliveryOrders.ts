import { API_BASE, apiFetch, handleResponse } from './client';
import type { DeliveryOutstandingOrder } from '../types';

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
