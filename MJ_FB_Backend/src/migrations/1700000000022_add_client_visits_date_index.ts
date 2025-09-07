import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('client_visits', [
  "date"
], {
    ifNotExists: true,
    name: 'client_visits_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('client_visits', [
  "date"
], { name: 'client_visits_date_idx' });
}
