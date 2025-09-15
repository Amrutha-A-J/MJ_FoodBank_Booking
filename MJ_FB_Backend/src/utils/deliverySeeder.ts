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
    maxItems: 1,
    items: ['BEEF', 'POULTRY', 'PORK', 'FISH', 'HALAL', 'EGGS'],
  },
  {
    name: 'FRESH VEGETABLE',
    maxItems: 2,
    items: ['POTATOES', 'CARROTS', 'LEAFY GREENS', 'EXTRA IF AVAILABLE'],
  },
  {
    name: 'FRESH FRUIT',
    maxItems: 1,
    items: ['ORANGES', 'APPLES', 'EXTRA FRESH IF AVAILABLE'],
  },
  {
    name: 'GRAINS',
    maxItems: 1,
    items: ['PASTA', 'RICE', 'LENTILS', 'CHICKPEAS'],
  },
  {
    name: 'SAUCE',
    maxItems: 1,
    items: ['PASTA SAUCE', 'CANNED TOMATOES'],
  },
  {
    name: 'SIDE DISHES',
    maxItems: 1,
    items: ['MAC & CHEESE', 'SIDEKICKS', 'BOXED POTAOTES', 'STOVE TOP', 'RAMAN NOODLES'],
  },
  {
    name: 'SOUP',
    maxItems: 1,
    items: ['TOMATO', 'CHICKEN NOODLE', 'CREAM OF MUSHROOM', 'VEGETABLE SOUP', 'HEARTY SOUP'],
  },
  {
    name: 'CANNED FRUIT',
    maxItems: 1,
    items: ['PEACHES', 'PINEAPPLE', 'APPLE SAUCE'],
  },
  {
    name: 'CANNED VEGETABLES',
    maxItems: 1,
    items: ['GREEN BEANS', 'CORN', 'PEAS', 'PEAS AND CARROTS'],
  },
  {
    name: 'CANNED PROTEIN',
    maxItems: 1,
    items: ['TUNA', 'SALMON', 'BROWN BEANS', 'KIDNEY BEANS', 'CHICKPEAS', 'LENTILS'],
  },
  {
    name: 'COOKIES/CRACKERS',
    maxItems: 1,
    items: ['COOKIES', 'CRACKERS'],
  },
  {
    name: 'SNACKS',
    maxItems: 1,
    items: ['SALTY', 'SWEET'],
  },
  {
    name: 'CONDIMENTS',
    maxItems: 1,
    items: [
      'KETCHUP',
      'MUSTARD',
      'MAYO',
      'BBQ SAUCE',
      'CREAMY SALAD DRESSING',
      'VINEGRETTE SALAD DRESSING',
    ],
  },
  {
    name: 'PET FOOD',
    maxItems: 2,
    items: ['CAT', 'DOG'],
  },
  {
    name: 'BAKERY',
    maxItems: 2,
    items: ['BREAD - WHITE', 'BREAD - BROWN', 'BUNS - WHITE', 'BUNS - BROWN', 'DESSERTS'],
  },
  {
    name: 'DAIRY',
    maxItems: 1,
    items: [
      'MILK FOR CHILDREN',
      'MILK SUBSTITUTE (IF AVAILABLE)',
      'YOGURT (IF AVAILABLE)',
      'CHEESE (IF AVAILABLE)',
    ],
  },
  {
    name: 'SPECIAL DIETARY NEEDS',
    maxItems: 5,
    items: ['DIABETIC', 'VEGETARIAN', 'VEGAN', 'GLUTTEN FREE', 'LACTOSE FREE'],
  },
  {
    name: "WOMEN'S SANITARY",
    maxItems: 1,
    items: ['TAMPONS', 'FEMININE NAPKINS (PADS)'],
  },
  {
    name: 'PERSONAL CARE',
    maxItems: 2,
    items: ['DEODERANT', 'TOOTHPASTE', 'TOOTHBRUSH', 'SHAMPOO', 'CONDITIONER'],
  },
  {
    name: 'HOUSEHOLD ITEMS',
    maxItems: 2,
    items: ['TOILET PAPER', 'GARBAGE BAGS', 'LAUNDRY SOAP', 'DRYER SHEETS', 'DISH SOAP'],
  },
  {
    name: 'BEVERAGES',
    maxItems: 1,
    items: ['COFFEE', 'TEA', 'JUICE'],
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
