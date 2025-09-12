import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM pantry_weekly_overall
    WHERE EXTRACT(MONTH FROM start_date) <> month;
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // no-op
}
