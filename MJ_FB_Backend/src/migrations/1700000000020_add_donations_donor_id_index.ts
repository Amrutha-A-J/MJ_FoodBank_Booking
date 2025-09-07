import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('donations', [
  "donor_id"
], {
    ifNotExists: true,
    name: 'donations_donor_id_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('donations', [
  "donor_id"
], { name: 'donations_donor_id_idx' });
}
