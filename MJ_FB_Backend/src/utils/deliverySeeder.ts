import pool from '../db';
import logger from './logger';

interface DeliveryCategorySeed {
  name: string;
  maxItems: number;
  items: string[];
}

const DELIVERY_SEED_DATA: DeliveryCategorySeed[] = [
  {
    name: 'Pantry Staples',
    maxItems: 6,
    items: ['Pasta', 'Rice', 'Canned Soup', 'Cereal', 'Canned Tomatoes', 'Peanut Butter'],
  },
  {
    name: 'Proteins',
    maxItems: 4,
    items: ['Canned Tuna', 'Canned Chicken', 'Beans', 'Lentils'],
  },
  {
    name: 'Fresh Produce',
    maxItems: 5,
    items: ['Apples', 'Bananas', 'Carrots', 'Onions', 'Potatoes'],
  },
  {
    name: 'Dairy & Eggs',
    maxItems: 3,
    items: ['Milk', 'Cheese', 'Eggs', 'Yogurt'],
  },
  {
    name: 'Frozen Meals',
    maxItems: 3,
    items: ['Frozen Vegetables', 'Frozen Meat', 'Frozen Entrées'],
  },
  {
    name: 'Household & Hygiene',
    maxItems: 3,
    items: ['Toilet Paper', 'Laundry Detergent', 'Soap', 'Shampoo'],
  },
  {
    name: 'Baby & Toddler',
    maxItems: 2,
    items: ['Diapers', 'Baby Formula', 'Baby Wipes'],
  },
  {
    name: 'Snacks & Extras',
    maxItems: 2,
    items: ['Granola Bars', 'Crackers', 'Juice Boxes'],
  },
];

export async function seedDeliveryData(): Promise<void> {
  const client = await pool.connect();

  try {
    const tableCheck = await client.query<{ categories: string | null; items: string | null }>(
      `SELECT
         to_regclass('public.delivery_categories') AS categories,
         to_regclass('public.delivery_items') AS items`,
    );

    const tables = tableCheck.rows[0];
    if (!tables?.categories || !tables?.items) {
      logger.warn('Skipping delivery seed: delivery tables not found');
      return;
    }

    for (const category of DELIVERY_SEED_DATA) {
      const insertCategory = await client.query<{ id: number }>(
        `INSERT INTO delivery_categories (name, max_items)
         SELECT $1, $2
          WHERE NOT EXISTS (
            SELECT 1 FROM delivery_categories WHERE name = $1
          )
         RETURNING id`,
        [category.name, category.maxItems],
      );

      let categoryId = insertCategory.rows[0]?.id;
      if (!categoryId) {
        const existingCategory = await client.query<{ id: number }>(
          'SELECT id FROM delivery_categories WHERE name = $1 LIMIT 1',
          [category.name],
        );
        categoryId = existingCategory.rows[0]?.id;
      }

      if (!categoryId) {
        logger.warn(`Skipping delivery items for category "${category.name}" – id lookup failed`);
        continue;
      }

      for (const item of category.items) {
        await client.query(
          `INSERT INTO delivery_items (category_id, name)
           VALUES ($1, $2)
           ON CONFLICT (category_id, name) DO NOTHING`,
          [categoryId, item],
        );
      }
    }

    logger.info('Delivery categories and items seeded');
  } catch (err) {
    logger.error('Error seeding delivery data:', err);
  } finally {
    client.release();
  }
}

export default seedDeliveryData;
