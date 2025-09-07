import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('bookings', [
  "new_client_id"
], {
    ifNotExists: true,
    name: 'bookings_new_client_id_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', [
  "new_client_id"
], { name: 'bookings_new_client_id_idx' });
}
