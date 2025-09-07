import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('volunteer_bookings', [
  "reschedule_token"
], {
    unique: true,
    ifNotExists: true,
    name: 'volunteer_bookings_reschedule_token_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('volunteer_bookings', [
  "reschedule_token"
], { name: 'volunteer_bookings_reschedule_token_idx' });
}
