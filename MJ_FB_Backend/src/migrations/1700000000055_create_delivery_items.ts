import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('delivery_items', {
    id: 'id',
    category_id: {
      type: 'integer',
      notNull: true,
      references: 'delivery_categories',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
  });

  pgm.addConstraint('delivery_items', 'delivery_items_category_name_unique', {
    unique: ['category_id', 'name'],
  });

  pgm.createIndex('delivery_items', ['category_id'], {
    name: 'delivery_items_category_id_idx',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('delivery_items');
}
