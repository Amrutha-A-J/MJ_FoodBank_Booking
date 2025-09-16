import { Request, Response } from 'express';
import pool from '../db';
import asyncHandler from '../middleware/asyncHandler';
import parseIdParam from '../utils/parseIdParam';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { getDeliverySettings } from '../utils/deliverySettings';
import logger from '../utils/logger';
import {
  createDeliveryOrderSchema,
  type DeliveryOrderSelectionInput,
  deliveryOrderStatusSchema,
  type DeliveryOrderStatus,
} from '../schemas/delivery/orderSchemas';

interface ItemInfoRow {
  itemId: number;
  categoryId: number;
  itemName: string;
  categoryName: string;
  maxItems: number;
}

interface DeliveryOrderRow {
  id: number;
  clientId: number;
  address: string;
  phone: string;
  email: string | null;
  status: DeliveryOrderStatus;
  scheduledFor: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
}

interface DeliveryOrderItemRow {
  orderId: number;
  itemId: number;
  quantity: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
}

interface DeliveryOrderItemDetail {
  itemId: number;
  quantity: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
}

type NormalizedSelection = { itemId: number; quantity: number };

interface CountRow {
  count: string;
}

function normalizeSelections(selections: DeliveryOrderSelectionInput[]): NormalizedSelection[] {
  const orderMap = new Map<number, { quantity: number; index: number }>();
  let order = 0;
  for (const selection of selections) {
    const existing = orderMap.get(selection.itemId);
    if (existing) {
      existing.quantity += selection.quantity;
    } else {
      orderMap.set(selection.itemId, { quantity: selection.quantity, index: order++ });
    }
  }
  return Array.from(orderMap.entries())
    .sort((a, b) => a[1].index - b[1].index)
    .map(([itemId, value]) => ({ itemId, quantity: value.quantity }));
}

function sortItems(items: DeliveryOrderItemDetail[]): DeliveryOrderItemDetail[] {
  return [...items].sort((a, b) => {
    const categoryCompare = a.categoryName.localeCompare(b.categoryName);
    if (categoryCompare !== 0) return categoryCompare;
    const itemCompare = a.itemName.localeCompare(b.itemName);
    if (itemCompare !== 0) return itemCompare;
    return a.itemId - b.itemId;
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function buildItemListHtml(items: DeliveryOrderItemDetail[]): string {
  if (items.length === 0) {
    return 'No items selected';
  }

  const grouped = new Map<
    number,
    { categoryName: string; selections: DeliveryOrderItemDetail[] }
  >();

  for (const item of items) {
    if (!grouped.has(item.categoryId)) {
      grouped.set(item.categoryId, { categoryName: item.categoryName, selections: [] });
    }
    grouped.get(item.categoryId)!.selections.push(item);
  }

  return Array.from(grouped.values())
    .map(({ categoryName, selections }) => {
      const itemsText = selections
        .map(selection => `${escapeHtml(selection.itemName)} x${selection.quantity}`)
        .join(', ');
      return `<strong>${escapeHtml(categoryName)}</strong> - ${itemsText}<br>`;
    })
    .join('');
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toNullableIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

export const createDeliveryOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createDeliveryOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { clientId, address, phone, email, selections } = parsed.data;
  const normalizedSelections = normalizeSelections(selections);

  const isClient = req.user.role === 'delivery';
  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';

  let shouldUpdateClientProfile = false;

  if (!isClient && !isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (isClient) {
    const requesterId = parseIdParam(req.user.id);
    if (!requesterId || requesterId !== clientId) {
      return res.status(403).json({ message: 'Cannot create orders for other clients' });
    }

    const currentAddress = req.user.address ?? '';
    const currentPhone = req.user.phone ?? '';
    const currentEmail = req.user.email ?? '';

    shouldUpdateClientProfile =
      currentAddress !== address || currentPhone !== phone || currentEmail !== email;
  }

  // created_at is stored in UTC, so convert to Regina time before truncating to the month
  const monthlyOrderCountResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::int AS count
       FROM delivery_orders
      WHERE client_id = $1
        AND status <> 'cancelled'
        AND date_trunc(
              'month',
              (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Regina'
            ) = date_trunc('month', timezone('America/Regina', now()))`,
    [clientId],
  );

  const monthlyOrderCount = Number(monthlyOrderCountResult.rows[0]?.count ?? 0);
  if (monthlyOrderCount >= 2) {
    return res.status(400).json({
      message: `You have already used the food bank ${monthlyOrderCount} times this month, please request again next month`,
    });
  }

  let itemDetails: DeliveryOrderItemDetail[] = [];

  if (normalizedSelections.length > 0) {
    const itemIds = normalizedSelections.map(item => item.itemId);
    const itemsResult = await pool.query<ItemInfoRow>(
      `SELECT i.id AS "itemId",
              i.category_id AS "categoryId",
              i.name AS "itemName",
              c.name AS "categoryName",
              c.max_items AS "maxItems"
         FROM delivery_items i
         JOIN delivery_categories c ON c.id = i.category_id
        WHERE i.id = ANY($1::int[])`,
      [itemIds],
    );

    if ((itemsResult.rowCount ?? 0) !== itemIds.length) {
      return res.status(400).json({ message: 'Invalid item selection' });
    }

    const itemById = new Map<number, ItemInfoRow>();
    for (const row of itemsResult.rows) {
      itemById.set(row.itemId, row);
    }

    const counts = new Map<number, { total: number; maxItems: number; categoryName: string }>();
    for (const selection of normalizedSelections) {
      const info = itemById.get(selection.itemId);
      if (!info) {
        return res.status(400).json({ message: 'Invalid item selection' });
      }
      const current = counts.get(info.categoryId) ?? {
        total: 0,
        maxItems: Number(info.maxItems),
        categoryName: info.categoryName,
      };
      current.total += selection.quantity;
      counts.set(info.categoryId, current);
      if (current.total > current.maxItems) {
        return res.status(400).json({
          message: `Too many items selected for ${info.categoryName}. Limit is ${current.maxItems}.`,
        });
      }
    }

    itemDetails = sortItems(
      normalizedSelections.map(selection => {
        const info = itemById.get(selection.itemId)!;
        return {
          itemId: selection.itemId,
          quantity: selection.quantity,
          itemName: info.itemName,
          categoryId: info.categoryId,
          categoryName: info.categoryName,
        };
      }),
    );
  }

  if (isClient && shouldUpdateClientProfile) {
    await pool.query(
      `UPDATE clients
          SET address = $1,
              phone = $2,
              email = $3
        WHERE client_id = $4`,
      [address, phone, email, clientId],
    );

    req.user.address = address;
    req.user.phone = phone;
    req.user.email = email;
  }

  const requestedStatus = parsed.data.status;
  const status = requestedStatus && isStaff ? requestedStatus : 'pending';
  const scheduledFor = parsed.data.scheduledFor ?? null;
  const notes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;

  const orderResult = await pool.query<DeliveryOrderRow>(
    `INSERT INTO delivery_orders (client_id, address, phone, email, status, scheduled_for, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"`,
    [clientId, address, phone, email, status, scheduledFor, notes],
  );

  const order = orderResult.rows[0];

  try {
    await pool.query('UPDATE clients SET address = $1 WHERE client_id = $2', [
      address,
      clientId,
    ]);
  } catch (error) {
    logger.error('Failed to update client address from delivery order', error);
  }

  if (normalizedSelections.length > 0) {
    const values = normalizedSelections
      .map((_selection, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`)
      .join(', ');
    const params: number[] = [order.id];
    for (const selection of normalizedSelections) {
      params.push(selection.itemId, selection.quantity);
    }
    await pool.query(
      `INSERT INTO delivery_order_items (order_id, item_id, qty) VALUES ${values}`,
      params,
    );
  }

  const createdAt = toIsoString(order.createdAt);
  const itemList = buildItemListHtml(itemDetails);

  try {
    const { requestEmail } = await getDeliverySettings();
    await sendTemplatedEmail({
      to: requestEmail,
      templateId: 16,
      params: {
        orderId: order.id,
        clientId,
        address,
        phone,
        email,
        itemList,
        createdAt,
      },
    });
  } catch (error) {
    logger.error('Failed to send delivery order notification email', error);
  }

  res.status(201).json({
    id: order.id,
    clientId: order.clientId,
    address: order.address,
    phone: order.phone,
    email: order.email,
    status: order.status,
    scheduledFor: toNullableIsoString(order.scheduledFor),
    notes: order.notes,
    createdAt,
    items: itemDetails,
  });
});

export const getDeliveryOrderHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const isClient = req.user.role === 'delivery';
  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';

  if (!isClient && !isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  let clientId: number | null = null;

  if (isClient) {
    clientId = parseIdParam(req.user.id);
  } else {
    const requested = req.query.clientId;
    clientId = parseIdParam(requested);
    if (!clientId) {
      return res.status(400).json({ message: 'clientId is required' });
    }
  }

  if (!clientId) {
    return res.status(400).json({ message: 'clientId is required' });
  }

  const ordersResult = await pool.query<DeliveryOrderRow>(
    `SELECT id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"
       FROM delivery_orders
      WHERE client_id = $1
      ORDER BY created_at DESC`,
    [clientId],
  );

  const orders = ordersResult.rows;
  const orderIds = orders.map(order => order.id);

  const itemsByOrder = new Map<number, DeliveryOrderItemDetail[]>();

  if (orderIds.length > 0) {
    const itemsResult = await pool.query<DeliveryOrderItemRow>(
      `SELECT oi.order_id AS "orderId",
              oi.item_id AS "itemId",
              oi.qty AS "quantity",
              i.name AS "itemName",
              i.category_id AS "categoryId",
              c.name AS "categoryName"
         FROM delivery_order_items oi
         JOIN delivery_items i ON i.id = oi.item_id
         JOIN delivery_categories c ON c.id = i.category_id
        WHERE oi.order_id = ANY($1::int[])
     ORDER BY c.name, i.name`,
      [orderIds],
    );

    for (const row of itemsResult.rows) {
      if (!itemsByOrder.has(row.orderId)) {
        itemsByOrder.set(row.orderId, []);
      }
      itemsByOrder.get(row.orderId)!.push({
        itemId: row.itemId,
        quantity: row.quantity,
        itemName: row.itemName,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
      });
    }

    for (const [orderId, items] of itemsByOrder.entries()) {
      itemsByOrder.set(orderId, sortItems(items));
    }
  }

  const response = orders.map(order => ({
    id: order.id,
    clientId: order.clientId,
    address: order.address,
    phone: order.phone,
    email: order.email,
    status: order.status,
    scheduledFor: toNullableIsoString(order.scheduledFor),
    notes: order.notes,
    createdAt: toIsoString(order.createdAt),
    items: itemsByOrder.get(order.id) ?? [],
  }));

  res.json(response);
});

const cancellableStatuses: ReadonlySet<DeliveryOrderStatus> = new Set<DeliveryOrderStatus>(
  deliveryOrderStatusSchema.options.filter(
    status => status !== 'completed' && status !== 'cancelled',
  ),
);

export const cancelDeliveryOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const orderId = parseIdParam(req.params.id);
  if (!orderId) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const orderResult = await pool.query<DeliveryOrderRow>(
    `SELECT id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"
       FROM delivery_orders
      WHERE id = $1`,
    [orderId],
  );

  const order = orderResult.rows[0];
  if (!order) {
    return res.status(404).json({ message: 'Delivery order not found' });
  }

  const isClient = req.user.role === 'delivery';
  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';
  if (isClient) {
    const requesterId = parseIdParam(req.user.id);
    if (!requesterId || requesterId !== order.clientId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (!isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!cancellableStatuses.has(order.status)) {
    return res.status(400).json({ message: 'This delivery request cannot be cancelled' });
  }

  const updatedResult = await pool.query<DeliveryOrderRow>(
    `UPDATE delivery_orders
        SET status = 'cancelled'
      WHERE id = $1
      RETURNING id, client_id AS "clientId", address, phone, email, status, scheduled_for AS "scheduledFor", notes, created_at AS "createdAt"`,
    [orderId],
  );

  const updated = updatedResult.rows[0];

  res.json({
    id: updated.id,
    clientId: updated.clientId,
    address: updated.address,
    phone: updated.phone,
    email: updated.email,
    status: updated.status,
    scheduledFor: toNullableIsoString(updated.scheduledFor),
    notes: updated.notes,
    createdAt: toIsoString(updated.createdAt),
  });
});
