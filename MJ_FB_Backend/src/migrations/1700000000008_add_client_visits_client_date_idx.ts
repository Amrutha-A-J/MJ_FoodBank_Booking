import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();
  pgm.sql('CREATE INDEX CONCURRENTLY client_visits_client_date_idx ON client_visits (client_id, date);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS client_visits_client_date_idx;');
}
