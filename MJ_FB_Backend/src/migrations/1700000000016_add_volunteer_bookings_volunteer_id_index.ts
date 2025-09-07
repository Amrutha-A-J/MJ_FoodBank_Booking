import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('volunteer_bookings', [
  "volunteer_id"
], {
    ifNotExists: true,
    name: 'volunteer_bookings_volunteer_id_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('volunteer_bookings', [
  "volunteer_id"
], { name: 'volunteer_bookings_volunteer_id_idx' });
}
