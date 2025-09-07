import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('bookings', [
  "reschedule_token"
], {
    unique: true,
    ifNotExists: true,
    name: 'bookings_reschedule_token_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', [
  "reschedule_token"
], { name: 'bookings_reschedule_token_idx' });
}
