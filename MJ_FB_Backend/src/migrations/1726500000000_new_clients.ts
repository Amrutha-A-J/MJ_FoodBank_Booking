import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('new_clients', {
    id: 'id',
    name: { type: 'text', notNull: true },
    email: { type: 'text' },
    phone: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addColumn('bookings', {
    new_client_id: {
      type: 'integer',
      references: 'new_clients',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('bookings', 'new_client_id');
  pgm.createIndex('new_clients', 'created_at');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', 'new_client_id');
  pgm.dropIndex('new_clients', 'created_at');
  pgm.dropColumn('bookings', 'new_client_id');
  pgm.dropTable('new_clients');
}

