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
}

export interface DeliveryOrder {
  id: number;
  clientId: number;
  address: string;
  phone: string;
  email: string | null;
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
     RETURNING id, category_id AS "categoryId", name`,
    [categoryId, name],
  );
  return res.rows[0];
}

export async function listDeliveryItems(
  client: Queryable = pool,
): Promise<DeliveryItem[]> {
  const res = await client.query<DeliveryItem>(
    `SELECT id, category_id AS "categoryId", name
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
    `SELECT id, category_id AS "categoryId", name
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
}

export interface UpdateDeliveryOrderParams {
  address?: string;
  phone?: string;
  email?: string | null;
}

const deliveryOrderSelectFields =
  'SELECT id, client_id AS "clientId", address, phone, email, created_at AS "createdAt"\n     FROM delivery_orders';

export async function createDeliveryOrder(
  params: CreateDeliveryOrderParams,
  client: Queryable = pool,
): Promise<DeliveryOrder> {
  const { clientId, address, phone, email = null } = params;
  const res = await client.query<DeliveryOrder>(
    `INSERT INTO delivery_orders (client_id, address, phone, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, client_id AS "clientId", address, phone, email, created_at AS "createdAt"`,
    [clientId, address, phone, email],
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

  if (sets.length === 0) {
    return fetchDeliveryOrder(id, client);
  }

  values.push(id);
  const res = await client.query<DeliveryOrder>(
    `UPDATE delivery_orders
        SET ${sets.join(', ')}
      WHERE id = $${sets.length + 1}
      RETURNING id, client_id AS "clientId", address, phone, email, created_at AS "createdAt"`,
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
