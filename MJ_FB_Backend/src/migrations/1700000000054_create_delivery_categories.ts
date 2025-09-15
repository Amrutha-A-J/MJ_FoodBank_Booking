import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('delivery_categories', {
    id: 'id',
    name: { type: 'text', notNull: true },
    max_items: { type: 'integer', notNull: true },
  });

  pgm.createIndex('delivery_categories', ['name'], {
    name: 'delivery_categories_name_idx',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('delivery_categories');
}
