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
    name: 'Protein',
    maxItems: 1,
    items: ['Beef', 'Poultry', 'Pork', 'Fish', 'Halal', 'Eggs'],
  },
  {
    name: 'Fresh Vegetable',
    maxItems: 2,
    items: ['Potatoes', 'Carrots', 'Leafy Greens', 'Extra If Available'],
  },
  {
    name: 'Fresh Fruit',
    maxItems: 1,
    items: ['Oranges', 'Apples', 'Extra Fresh If Available'],
  },
  {
    name: 'Grains',
    maxItems: 1,
    items: ['Pasta', 'Rice', 'Lentils', 'Chickpeas'],
  },
  {
    name: 'Sauce',
    maxItems: 1,
    items: ['Pasta Sauce', 'Canned Tomatoes'],
  },
  {
    name: 'Side Dishes',
    maxItems: 1,
    items: ['Mac & Cheese', 'Sidekicks', 'Boxed Potaotes', 'Stove Top', 'Raman Noodles'],
  },
  {
    name: 'Soup',
    maxItems: 1,
    items: ['Tomato', 'Chicken Noodle', 'Cream Of Mushroom', 'Vegetable Soup', 'Hearty Soup'],
  },
  {
    name: 'Canned Fruit',
    maxItems: 1,
    items: ['Peaches', 'Pineapple', 'Apple Sauce'],
  },
  {
    name: 'Canned Vegetables',
    maxItems: 1,
    items: ['Green Beans', 'Corn', 'Peas', 'Peas And Carrots'],
  },
  {
    name: 'Canned Protein',
    maxItems: 1,
    items: ['Tuna', 'Salmon', 'Brown Beans', 'Kidney Beans', 'Chickpeas', 'Lentils'],
  },
  {
    name: 'Cookies/Crackers',
    maxItems: 1,
    items: ['Cookies', 'Crackers'],
  },
  {
    name: 'Snacks',
    maxItems: 1,
    items: ['Salty', 'Sweet'],
  },
  {
    name: 'Condiments',
    maxItems: 1,
    items: [
      'Ketchup',
      'Mustard',
      'Mayo',
      'Bbq Sauce',
      'Creamy Salad Dressing',
      'Vinegrette Salad Dressing',
    ],
  },
  {
    name: 'Pet Food',
    maxItems: 2,
    items: ['Cat', 'Dog'],
  },
  {
    name: 'Bakery',
    maxItems: 2,
    items: ['Bread - White', 'Bread - Brown', 'Buns - White', 'Buns - Brown', 'Desserts'],
  },
  {
    name: 'Dairy',
    maxItems: 1,
    items: [
      'Milk For Children',
      'Milk Substitute (If Available)',
      'Yogurt (If Available)',
      'Cheese (If Available)',
    ],
  },
  {
    name: 'Special Dietary Needs',
    maxItems: 5,
    items: ['Diabetic', 'Vegetarian', 'Vegan', 'Glutten Free', 'Lactose Free'],
  },
  {
    name: "Women's Sanitary",
    maxItems: 1,
    items: ['Tampons', 'Feminine Napkins (Pads)'],
  },
  {
    name: 'Personal Care',
    maxItems: 2,
    items: ['Deoderant', 'Toothpaste', 'Toothbrush', 'Shampoo', 'Conditioner'],
  },
  {
    name: 'Household Items',
    maxItems: 2,
    items: ['Toilet Paper', 'Garbage Bags', 'Laundry Soap', 'Dryer Sheets', 'Dish Soap'],
  },
  {
    name: 'Beverages',
    maxItems: 1,
    items: ['Coffee', 'Tea', 'Juice'],
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
