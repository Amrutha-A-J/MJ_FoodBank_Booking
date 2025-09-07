import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('volunteer_bookings', [
  "volunteer_id",
  "slot_id",
  "date"
], {
    unique: true,
    ifNotExists: true,
    where: "status <> 'cancelled'",
    name: 'volunteer_bookings_unique_volunteer_slot_date'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('volunteer_bookings', [
  "volunteer_id",
  "slot_id",
  "date"
], { name: 'volunteer_bookings_unique_volunteer_slot_date' });
}
