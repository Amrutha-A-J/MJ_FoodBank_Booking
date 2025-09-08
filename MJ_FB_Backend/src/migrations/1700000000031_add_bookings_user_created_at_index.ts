import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();
  pgm.sql('CREATE INDEX CONCURRENTLY bookings_user_created_at_idx ON bookings (user_id, created_at DESC);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS bookings_user_created_at_idx;');
}
