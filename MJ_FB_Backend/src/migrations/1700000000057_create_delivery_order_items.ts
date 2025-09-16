import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    'delivery_order_items',
    {
      order_id: {
        type: 'integer',
        notNull: true,
        references: 'delivery_orders',
        onDelete: 'CASCADE',
      },
      item_id: {
        type: 'integer',
        notNull: true,
        references: 'delivery_items',
        onDelete: 'CASCADE',
      },
      qty: { type: 'integer', notNull: true },
    },
    {
      constraints: {
        primaryKey: ['order_id', 'item_id'],
      },
    },
  );

  pgm.addConstraint('delivery_order_items', 'delivery_order_items_qty_positive', {
    check: 'qty > 0',
  });

  pgm.createIndex('delivery_order_items', ['item_id'], {
    name: 'delivery_order_items_item_id_idx',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('delivery_order_items');
}
