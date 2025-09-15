import pool from '../db';
import { createDeliveryCategory, createDeliveryItem } from '../models/delivery';
import { Queryable } from '../models/bookingRepository';
import logger from './logger';

export interface DeliveryCategorySeedDefinition {
  name: string;
  maxItems: number;
  items: string[];
}

export const DELIVERY_CATEGORY_SEEDS: DeliveryCategorySeedDefinition[] = [
  {
    name: 'PROTEIN',
    maxItems: 4,
    items: ['Canned Tuna', 'Canned Chicken', 'Canned Beans', 'Peanut Butter'],
  },
  {
    name: 'FRESH VEGETABLE',
    maxItems: 6,
    items: ['Carrots', 'Potatoes', 'Onions', 'Bell Peppers', 'Broccoli'],
  },
  {
    name: 'BEVERAGES',
    maxItems: 3,
    items: ['Coffee', 'Tea', 'Juice Boxes', 'Shelf-Stable Milk'],
  },
];

interface CategoryRow {
  id: number;
  max_items: number;
}

interface ItemRow {
  id: number;
}

export async function seedDeliveryCategory(
  definition: DeliveryCategorySeedDefinition,
  client: Queryable = pool,
): Promise<void> {
  const { name, maxItems, items } = definition;

  const existingCategory = await client.query<CategoryRow>(
    'SELECT id, max_items FROM delivery_categories WHERE name = $1',
    [name],
  );

  let categoryId: number;
  if (existingCategory.rowCount && existingCategory.rows.length > 0) {
    categoryId = existingCategory.rows[0].id;
    if (Number(existingCategory.rows[0].max_items) !== maxItems) {
      await client.query('UPDATE delivery_categories SET max_items = $1 WHERE id = $2', [maxItems, categoryId]);
      logger.info(`[deliverySeeder] Updated max_items for ${name} to ${maxItems}`);
    }
  } else {
    const category = await createDeliveryCategory(name, maxItems, client);
    categoryId = category.id;
    logger.info(`[deliverySeeder] Created delivery category ${name}`);
  }

  for (const itemName of items) {
    const existingItem = await client.query<ItemRow>(
      'SELECT id FROM delivery_items WHERE category_id = $1 AND name = $2',
      [categoryId, itemName],
    );

    if (!existingItem.rowCount) {
      await createDeliveryItem(categoryId, itemName, client);
      logger.info(`[deliverySeeder] Added item "${itemName}" to ${name}`);
    }
  }
}

export async function seedDeliveryData(
  definitions: DeliveryCategorySeedDefinition[] = DELIVERY_CATEGORY_SEEDS,
  client: Queryable = pool,
): Promise<void> {
  for (const definition of definitions) {
    await seedDeliveryCategory(definition, client);
  }
}

export default seedDeliveryData;

if (require.main === module) {
  seedDeliveryData()
    .then(() => {
      logger.info('[deliverySeeder] Seeding complete');
    })
    .catch((error) => {
      logger.error('[deliverySeeder] Failed to seed delivery data', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
