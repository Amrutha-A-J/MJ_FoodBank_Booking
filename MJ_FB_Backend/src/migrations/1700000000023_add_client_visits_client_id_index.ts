import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('client_visits', [
  "client_id"
], {
    ifNotExists: true,
    name: 'client_visits_client_id_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('client_visits', [
  "client_id"
], { name: 'client_visits_client_id_idx' });
}
