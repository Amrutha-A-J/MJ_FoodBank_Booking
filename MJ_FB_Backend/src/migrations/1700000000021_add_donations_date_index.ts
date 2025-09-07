import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('donations', [
  "date"
], {
    ifNotExists: true,
    name: 'donations_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('donations', [
  "date"
], { name: 'donations_date_idx' });
}
