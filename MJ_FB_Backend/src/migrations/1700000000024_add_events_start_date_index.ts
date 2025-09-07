import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('events', [
  "start_date"
], {
    ifNotExists: true,
    name: 'events_start_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('events', [
  "start_date"
], { name: 'events_start_date_idx' });
}
