import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP FUNCTION IF EXISTS refresh_pantry_weekly(integer, integer, integer);');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_pantry_monthly(integer, integer);');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_pantry_yearly(integer);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE FUNCTION refresh_pantry_weekly(year integer, month integer, week integer)
    RETURNS void AS $$
    BEGIN
      RETURN;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE FUNCTION refresh_pantry_monthly(year integer, month integer)
    RETURNS void AS $$
    BEGIN
      RETURN;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE FUNCTION refresh_pantry_yearly(year integer)
    RETURNS void AS $$
    BEGIN
      RETURN;
    END;
    $$ LANGUAGE plpgsql;
  `);
}
