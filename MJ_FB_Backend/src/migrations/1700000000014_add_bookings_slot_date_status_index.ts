import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('bookings', [
  "slot_id",
  "date",
  "status"
], {
    ifNotExists: true,
    name: 'bookings_slot_date_status_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', [
  "slot_id",
  "date",
  "status"
], { name: 'bookings_slot_date_status_idx' });
}
