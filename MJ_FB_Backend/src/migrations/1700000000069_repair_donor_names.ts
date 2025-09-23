import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();

  pgm.sql(`
    DO $do$
    DECLARE
      has_name_column boolean;
      has_first_name_column boolean;
      has_last_name_column boolean;
    BEGIN
      SELECT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'donors'
           AND column_name = 'name'
      ) INTO has_name_column;

      SELECT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'donors'
           AND column_name = 'first_name'
      ) INTO has_first_name_column;

      SELECT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'donors'
           AND column_name = 'last_name'
      ) INTO has_last_name_column;

      IF has_name_column AND has_last_name_column THEN
        EXECUTE $fn$
          UPDATE donors
             SET last_name = COALESCE(
               NULLIF(BTRIM(REGEXP_REPLACE(name, '^\\S+\\s*', '')), ''),
               ''
             )
        $fn$;
      END IF;

      IF has_name_column AND has_first_name_column AND has_last_name_column THEN
        EXECUTE $fn$
          UPDATE donors
             SET name = COALESCE(
               NULLIF(
                 BTRIM(
                   CONCAT_WS(
                     ' ',
                     NULLIF(BTRIM(first_name), ''),
                     NULLIF(BTRIM(last_name), '')
                   )
                 ),
                 ''
               ),
               name
             )
        $fn$;
      END IF;
    END $do$;
  `);
}

export async function down(): Promise<void> {
  // Data repair migration; no rollback necessary.
}
