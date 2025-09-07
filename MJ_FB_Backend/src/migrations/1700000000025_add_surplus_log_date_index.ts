import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('surplus_log', [
  "date"
], {
    ifNotExists: true,
    name: 'surplus_log_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('surplus_log', [
  "date"
], { name: 'surplus_log_date_idx' });
}
