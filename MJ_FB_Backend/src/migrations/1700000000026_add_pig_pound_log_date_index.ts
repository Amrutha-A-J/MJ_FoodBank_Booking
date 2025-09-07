import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('pig_pound_log', [
  "date"
], {
    ifNotExists: true,
    name: 'pig_pound_log_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('pig_pound_log', [
  "date"
], { name: 'pig_pound_log_date_idx' });
}
