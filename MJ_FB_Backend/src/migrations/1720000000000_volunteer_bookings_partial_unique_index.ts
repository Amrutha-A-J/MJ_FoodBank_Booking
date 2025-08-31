import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS volunteer_bookings_unique_volunteer_slot_date;`);
  pgm.sql(`CREATE UNIQUE INDEX volunteer_bookings_unique_volunteer_slot_date ON volunteer_bookings (volunteer_id, slot_id, date) WHERE status <> 'cancelled';`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS volunteer_bookings_unique_volunteer_slot_date;`);
  pgm.sql(`CREATE UNIQUE INDEX volunteer_bookings_unique_volunteer_slot_date ON volunteer_bookings (volunteer_id, slot_id, date);`);
}
