import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('new_clients', [{ name: 'created_at', sort: 'DESC' }], {
    ifNotExists: true,
    name: 'new_clients_created_at_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('new_clients', ['created_at'], { name: 'new_clients_created_at_idx' });
}
