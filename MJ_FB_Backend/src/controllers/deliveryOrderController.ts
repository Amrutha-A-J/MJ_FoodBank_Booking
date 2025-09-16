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

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
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

  if (!isClient && !isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (isClient) {
    const requesterId = parseIdParam(req.user.id);
    if (!requesterId || requesterId !== clientId) {
      return res.status(403).json({ message: 'Cannot create orders for other clients' });
    }
  }

  const monthlyOrderCountResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::int AS count
       FROM delivery_orders
      WHERE client_id = $1
        AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
    [clientId],
  );

  const monthlyOrderCount = Number(monthlyOrderCountResult.rows[0]?.count ?? 0);
  if (monthlyOrderCount >= 2) {
    return res.status(400).json({ message: "You've reached the monthly delivery limit" });
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

  const orderResult = await pool.query<DeliveryOrderRow>(
    `INSERT INTO delivery_orders (client_id, address, phone, email)
         VALUES ($1, $2, $3, $4)
      RETURNING id, client_id AS "clientId", address, phone, email, created_at AS "createdAt"`,
    [clientId, address, phone, email],
  );

  const order = orderResult.rows[0];

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
  const itemList =
    itemDetails.length > 0
      ? itemDetails
          .map(item => `${item.categoryName}: ${item.itemName} x${item.quantity}`)
          .join('\n')
      : 'No items selected';

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
    `SELECT id, client_id AS "clientId", address, phone, email, created_at AS "createdAt"
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
    createdAt: toIsoString(order.createdAt),
    items: itemsByOrder.get(order.id) ?? [],
  }));

  res.json(response);
});
