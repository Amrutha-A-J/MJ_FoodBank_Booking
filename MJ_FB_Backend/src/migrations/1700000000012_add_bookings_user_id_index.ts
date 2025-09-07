import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('bookings', [
  "user_id"
], {
    ifNotExists: true,
    name: 'bookings_user_id_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', [
  "user_id"
], { name: 'bookings_user_id_idx' });
}
