import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE UNIQUE INDEX new_clients_email_lower_idx ON new_clients (LOWER(email));`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP INDEX IF EXISTS new_clients_email_lower_idx;');
}

