import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('slots', [
  "start_time",
  "end_time"
], {
    unique: true,
    ifNotExists: true,
    name: 'slots_unique_start_end'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('slots', [
  "start_time",
  "end_time"
], { name: 'slots_unique_start_end' });
}
