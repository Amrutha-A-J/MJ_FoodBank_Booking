import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('volunteer_bookings', [
  "slot_id",
  "date",
  "status"
], {
    ifNotExists: true,
    name: 'volunteer_bookings_slot_date_status_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('volunteer_bookings', [
  "slot_id",
  "date",
  "status"
], { name: 'volunteer_bookings_slot_date_status_idx' });
}
