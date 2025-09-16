import type { MigrationBuilder } from 'node-pg-migrate';

const deliveryOrdersStatusIndex = 'delivery_orders_status_idx';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('delivery_orders', {
    status: { type: 'text', notNull: true, default: 'pending' },
    scheduled_for: { type: 'timestamp' },
    notes: { type: 'text' },
  });

  pgm.createIndex('delivery_orders', ['status'], {
    name: deliveryOrdersStatusIndex,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('delivery_orders', ['status'], {
    name: deliveryOrdersStatusIndex,
  });

  pgm.dropColumns('delivery_orders', ['status', 'scheduled_for', 'notes']);
}
