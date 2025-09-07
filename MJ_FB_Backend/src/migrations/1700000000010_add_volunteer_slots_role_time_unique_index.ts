import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('volunteer_slots', [
  "role_id",
  "start_time",
  "end_time"
], {
    unique: true,
    ifNotExists: true,
    name: 'volunteer_slots_unique_role_time'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('volunteer_slots', [
  "role_id",
  "start_time",
  "end_time"
], { name: 'volunteer_slots_unique_role_time' });
}
