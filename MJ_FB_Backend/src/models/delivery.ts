import pool from '../db';
import { Queryable } from './bookingRepository';

export interface DeliveryCategory {
  id: number;
  name: string;
  maxItems: number;
}

export interface DeliveryItem {
  id: number;
  categoryId: number;
  name: string;
  isActive: boolean;
}

export interface DeliveryOrder {
  id: number;
  clientId: number;
  address: string;
  phone: string;
  email: string | null;
  status: string;
  scheduledFor: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DeliveryOrderItem {
  orderId: number;
  itemId: number;
  qty: number;
}

export async function createDeliveryCategory(
  name: string,
  maxItems: number,
  client: Queryable = pool,
): Promise<DeliveryCategory> {
  const res = await client.query<DeliveryCategory>(
    `INSERT INTO delivery_categories (name, max_items)
     VALUES ($1, $2)
     RETURNING id, name, max_items AS "maxItems"`,
    [name, maxItems],
  );
  return res.rows[0];
}

export async function listDeliveryCategories(
  client: Queryable = pool,
): Promise<DeliveryCategory[]> {
  const res = await client.query<DeliveryCategory>(
    `SELECT id, name, max_items AS "maxItems"
       FROM delivery_categories
      ORDER BY name`,
  );
  return res.rows;
}

export async function createDeliveryItem(
  categoryId: number,
  name: string,
  client: Queryable = pool,
): Promise<DeliveryItem> {
  const res = await client.query<DeliveryItem>(
    `INSERT INTO delivery_items (category_id, name)
     VALUES ($1, $2)
     RETURNING id, category_id AS "categoryId", name, is_active AS "isActive"`,
    [categoryId, name],
  );
  return res.rows[0];
}

export async function listDeliveryItems(
  client: Queryable = pool,
): Promise<DeliveryItem[]> {
  const res = await client.query<DeliveryItem>(
    `SELECT id, category_id AS "categoryId", name, is_active AS "isActive"
       FROM delivery_items
      ORDER BY name`,
  );
  return res.rows;
}

export async function listDeliveryItemsByCategory(
  categoryId: number,
  client: Queryable = pool,
): Promise<DeliveryItem[]> {
  const res = await client.query<DeliveryItem>(
    `SELECT id, category_id AS "categoryId", name, is_active AS "isActive"
       FROM delivery_items
      WHERE category_id = $1
      ORDER BY name`,
    [categoryId],
  );
  return res.rows;
}

export interface CreateDeliveryOrderParams {
  clientId: number;
  address: string;
  phone: string;
  email?: string | null;
  status?: string;
  scheduledFor?: string | Date | null;
  notes?: string | null;
}

export interface UpdateDeliveryOrderParams {
  address?: string;
  phone?: string;
  email?: string | null;
  status?: string;
  scheduledFor?: string | Date | null;
  notes?: string | null;
}

const deliveryOrderSelectFields =
  'SELECT id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"\n     FROM delivery_orders';

export async function createDeliveryOrder(
  params: CreateDeliveryOrderParams,
  client: Queryable = pool,
): Promise<DeliveryOrder> {
  const {
    clientId,
    address,
    phone,
    email = null,
    status = 'pending',
    scheduledFor = null,
    notes = null,
  } = params;

  const normalizedScheduledFor =
    scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor ?? null;
  const res = await client.query<DeliveryOrder>(
    `INSERT INTO delivery_orders (client_id, address, phone, email, status, scheduled_for, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"`,
    [clientId, address, phone, email, status, normalizedScheduledFor, notes],
  );
  return res.rows[0];
}

export async function updateDeliveryOrder(
  id: number,
  updates: UpdateDeliveryOrderParams,
  client: Queryable = pool,
): Promise<DeliveryOrder | null> {
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.address !== undefined) {
    sets.push(`address = $${sets.length + 1}`);
    values.push(updates.address);
  }
  if (updates.phone !== undefined) {
    sets.push(`phone = $${sets.length + 1}`);
    values.push(updates.phone);
  }
  if (updates.email !== undefined) {
    sets.push(`email = $${sets.length + 1}`);
    values.push(updates.email);
  }
  if (updates.status !== undefined) {
    sets.push(`status = $${sets.length + 1}`);
    values.push(updates.status);
  }
  if (updates.scheduledFor !== undefined) {
    sets.push(`scheduled_for = $${sets.length + 1}`);
    const scheduledForValue =
      updates.scheduledFor instanceof Date
        ? updates.scheduledFor.toISOString()
        : updates.scheduledFor ?? null;
    values.push(scheduledForValue);
  }
  if (updates.notes !== undefined) {
    sets.push(`notes = $${sets.length + 1}`);
    values.push(updates.notes);
  }

  if (sets.length === 0) {
    return fetchDeliveryOrder(id, client);
  }

  values.push(id);
  const res = await client.query<DeliveryOrder>(
    `UPDATE delivery_orders
        SET ${sets.join(', ')}
      WHERE id = $${sets.length + 1}
      RETURNING id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"`,
    values,
  );
  return res.rows[0] ?? null;
}

export async function fetchDeliveryOrder(
  id: number,
  client: Queryable = pool,
): Promise<DeliveryOrder | null> {
  const res = await client.query<DeliveryOrder>(
    `${deliveryOrderSelectFields}
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function listDeliveryOrders(
  client: Queryable = pool,
): Promise<DeliveryOrder[]> {
  const res = await client.query<DeliveryOrder>(
    `${deliveryOrderSelectFields}
      ORDER BY created_at DESC`,
  );
  return res.rows;
}

export async function deleteDeliveryOrder(
  id: number,
  client: Queryable = pool,
): Promise<void> {
  await client.query('DELETE FROM delivery_orders WHERE id = $1', [id]);
}

export async function setDeliveryOrderItemQuantity(
  orderId: number,
  itemId: number,
  qty: number,
  client: Queryable = pool,
): Promise<DeliveryOrderItem | null> {
  if (qty <= 0) {
    await client.query('DELETE FROM delivery_order_items WHERE order_id = $1 AND item_id = $2', [orderId, itemId]);
    return null;
  }

  const res = await client.query<DeliveryOrderItem>(
    `INSERT INTO delivery_order_items (order_id, item_id, qty)
     VALUES ($1, $2, $3)
     ON CONFLICT (order_id, item_id)
     DO UPDATE SET qty = EXCLUDED.qty
     RETURNING order_id AS "orderId", item_id AS "itemId", qty`,
    [orderId, itemId, qty],
  );
  return res.rows[0];
}

export async function listDeliveryOrderItems(
  orderId: number,
  client: Queryable = pool,
): Promise<DeliveryOrderItem[]> {
  const res = await client.query<DeliveryOrderItem>(
    `SELECT order_id AS "orderId", item_id AS "itemId", qty
       FROM delivery_order_items
      WHERE order_id = $1
      ORDER BY item_id`,
    [orderId],
  );
  return res.rows;
}

export async function clearDeliveryOrderItems(
  orderId: number,
  client: Queryable = pool,
): Promise<void> {
  await client.query('DELETE FROM delivery_order_items WHERE order_id = $1', [orderId]);
}
