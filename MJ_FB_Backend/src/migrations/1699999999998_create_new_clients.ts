import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('new_clients', {
    id: 'id',
    name: { type: 'text', notNull: true },
    email: { type: 'text' },
    phone: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addColumn('bookings', {
    new_client_id: {
      type: 'integer',
      references: 'new_clients',
      onDelete: 'set null',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('bookings', 'new_client_id');
  pgm.dropTable('new_clients');
}
