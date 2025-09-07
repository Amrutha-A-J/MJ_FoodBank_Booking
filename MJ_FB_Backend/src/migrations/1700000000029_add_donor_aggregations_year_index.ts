import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('donor_aggregations', [
  "year"
], {
    ifNotExists: true,
    name: 'donor_aggregations_year_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('donor_aggregations', [
  "year"
], { name: 'donor_aggregations_year_idx' });
}
