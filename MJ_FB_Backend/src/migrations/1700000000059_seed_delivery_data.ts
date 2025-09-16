import type { MigrationBuilder } from 'node-pg-migrate';
import type { Queryable } from '../models/bookingRepository';
import seedDeliveryData, { DELIVERY_CATEGORY_SEEDS } from '../utils/deliverySeeder';

export async function up(pgm: MigrationBuilder): Promise<void> {
  await seedDeliveryData(undefined, pgm.db as unknown as Queryable);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const client = pgm.db as unknown as Queryable;

  for (const { name, items } of DELIVERY_CATEGORY_SEEDS) {
    await client.query(
      `
        DELETE FROM delivery_items
        WHERE category_id IN (
          SELECT id FROM delivery_categories WHERE name = $1
        )
        AND name = ANY($2::text[])
      `,
      [name, items],
    );
  }

  await client.query(
    'DELETE FROM delivery_categories WHERE name = ANY($1::text[])',
    [DELIVERY_CATEGORY_SEEDS.map(({ name }) => name)],
  );
}
