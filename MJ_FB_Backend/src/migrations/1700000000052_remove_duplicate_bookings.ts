import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    WITH duplicates AS (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id, date
                 ORDER BY created_at, id
               ) AS rn
        FROM bookings
      ) t
      WHERE t.rn > 1
    )
    DELETE FROM bookings
    WHERE id IN (SELECT id FROM duplicates);
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // no-op
}
