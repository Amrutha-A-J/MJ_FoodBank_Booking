import { API_BASE, apiFetch, handleResponse } from './client';
import type {
  DeliveryOrder,
  DeliveryOutstandingOrder,
  DeliveryOrderStatus,
} from '../types';

export interface CreateDeliveryOrderPayload {
  clientId: number;
  address: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  scheduledFor?: string | null;
  status?: DeliveryOrderStatus;
  selections?: { itemId: number; quantity: number }[];
}

export async function createDeliveryOrder(
  payload: CreateDeliveryOrderPayload,
): Promise<DeliveryOrder> {
  const res = await apiFetch(`${API_BASE}/delivery/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<DeliveryOrder>(res);
}

export async function getOutstandingDeliveryOrders(): Promise<DeliveryOutstandingOrder[]> {
  const res = await apiFetch(`${API_BASE}/delivery/orders/outstanding`);
  return handleResponse<DeliveryOutstandingOrder[]>(res);
}

export async function markDeliveryOrderCompleted(
  orderId: number,
  weight: number,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/delivery/orders/${orderId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight }),
  });
  await handleResponse(res);
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
