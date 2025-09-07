import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('warehouse_overall', [
  "year"
], {
    ifNotExists: true,
    name: 'warehouse_overall_year_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('warehouse_overall', [
  "year"
], { name: 'warehouse_overall_year_idx' });
}
