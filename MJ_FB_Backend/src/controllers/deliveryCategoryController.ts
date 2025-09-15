import { Request, Response } from 'express';
import pool from '../db';
import asyncHandler from '../middleware/asyncHandler';
import parseIdParam from '../utils/parseIdParam';
import type {
  CreateDeliveryCategoryInput,
  CreateDeliveryItemInput,
  UpdateDeliveryCategoryInput,
  UpdateDeliveryItemInput,
} from '../schemas/delivery/categorySchemas';

interface CategoryRow {
  id: number;
  name: string;
  max_items: number;
}

interface ItemRow {
  id: number;
  category_id: number;
  name: string;
  is_active: boolean | null;
}

const mapCategory = (row: CategoryRow) => ({
  id: row.id,
  name: row.name,
  maxItems: Number(row.max_items),
});

const mapItem = (row: ItemRow) => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  isActive: row.is_active !== false,
});

export const listDeliveryCategories = asyncHandler(async (_req: Request, res: Response) => {
  const [categoriesResult, itemsResult] = await Promise.all([
    pool.query<CategoryRow>('SELECT id, name, max_items FROM delivery_categories ORDER BY name, id'),
    pool.query<ItemRow>('SELECT id, category_id, name, is_active FROM delivery_items ORDER BY name, id'),
  ]);

  const itemsByCategory = new Map<number, ReturnType<typeof mapItem>[]>();
  for (const row of itemsResult.rows) {
    const formatted = mapItem(row);
    if (!itemsByCategory.has(formatted.categoryId)) {
      itemsByCategory.set(formatted.categoryId, []);
    }
    itemsByCategory.get(formatted.categoryId)!.push(formatted);
  }

  const categories = categoriesResult.rows.map(row => ({
    ...mapCategory(row),
    items: itemsByCategory.get(row.id) ?? [],
  }));

  res.json(categories);
});

export const createDeliveryCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, maxItems } = req.body as CreateDeliveryCategoryInput;
  const result = await pool.query<CategoryRow>(
    'INSERT INTO delivery_categories (name, max_items) VALUES ($1, $2) RETURNING id, name, max_items',
    [name, maxItems],
  );
  res.status(201).json({ ...mapCategory(result.rows[0]), items: [] });
});

export const updateDeliveryCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid category id' });
  }
  const { name, maxItems } = req.body as UpdateDeliveryCategoryInput;
  const result = await pool.query<CategoryRow>(
    'UPDATE delivery_categories SET name = $1, max_items = $2 WHERE id = $3 RETURNING id, name, max_items',
    [name, maxItems, id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.json(mapCategory(result.rows[0]));
});

export const deleteDeliveryCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid category id' });
  }
  const result = await pool.query('DELETE FROM delivery_categories WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(204).send();
});

export const createDeliveryItem = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = parseIdParam(req.params.categoryId);
  if (!categoryId) {
    return res.status(400).json({ message: 'Invalid category id' });
  }
  const { name, isActive } = req.body as CreateDeliveryItemInput;
  try {
    const result = await pool.query<ItemRow>(
      'INSERT INTO delivery_items (category_id, name, is_active) VALUES ($1, $2, $3) RETURNING id, category_id, name, is_active',
      [categoryId, name, isActive],
    );
    res.status(201).json(mapItem(result.rows[0]));
  } catch (error: any) {
    if (error?.code === '23503') {
      return res.status(404).json({ message: 'Category not found' });
    }
    throw error;
  }
});

export const updateDeliveryItem = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = parseIdParam(req.params.categoryId);
  const itemId = parseIdParam(req.params.itemId);
  if (!categoryId || !itemId) {
    return res.status(400).json({ message: 'Invalid category or item id' });
  }
  const { name, isActive } = req.body as UpdateDeliveryItemInput;
  const updates: string[] = [];
  const params: Array<string | number | boolean> = [];
  let index = 1;

  if (name !== undefined) {
    updates.push(`name = $${index++}`);
    params.push(name);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${index++}`);
    params.push(isActive);
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No changes provided' });
  }

  params.push(itemId, categoryId);

  const result = await pool.query<ItemRow>(
    `UPDATE delivery_items SET ${updates.join(', ')} WHERE id = $${index++} AND category_id = $${index} RETURNING id, category_id, name, is_active`,
    params,
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Item not found' });
  }
  res.json(mapItem(result.rows[0]));
});

export const deleteDeliveryItem = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = parseIdParam(req.params.categoryId);
  const itemId = parseIdParam(req.params.itemId);
  if (!categoryId || !itemId) {
    return res.status(400).json({ message: 'Invalid category or item id' });
  }
  const result = await pool.query('DELETE FROM delivery_items WHERE id = $1 AND category_id = $2', [
    itemId,
    categoryId,
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Item not found' });
  }
  res.status(204).send();
});
