import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('delivery_orders', {
    id: 'id',
    client_id: {
      type: 'integer',
      notNull: true,
      references: 'clients(client_id)',
    },
    address: { type: 'text', notNull: true },
    phone: { type: 'text', notNull: true },
    email: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('delivery_orders', ['client_id'], {
    name: 'delivery_orders_client_id_idx',
  });
  pgm.createIndex('delivery_orders', ['created_at'], {
    name: 'delivery_orders_created_at_idx',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('delivery_orders');
}
