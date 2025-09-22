import type { MigrationBuilder } from 'node-pg-migrate';

const UNIQUE_CONSTRAINT_NAME = 'donors_name_unique';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('donors', {
    name: { type: 'text' },
  });

  pgm.sql(`
    WITH normalized AS (
      SELECT
        id,
        base_name,
        ROW_NUMBER() OVER (PARTITION BY base_name ORDER BY id) AS row_number
      FROM (
        SELECT
          id,
          TRIM(BOTH FROM CONCAT_WS(' ', first_name, last_name)) AS base_name
        FROM donors
      ) src
    )
    UPDATE donors d
       SET name = CASE
         WHEN n.base_name <> '' AND n.row_number = 1 THEN n.base_name
         WHEN n.base_name <> '' THEN CONCAT(n.base_name, ' #', d.id)
         ELSE CONCAT('Donor #', d.id)
       END
      FROM normalized n
     WHERE d.id = n.id
  `);

  pgm.alterColumn('donors', 'name', { notNull: true });

  pgm.addConstraint('donors', UNIQUE_CONSTRAINT_NAME, { unique: 'name' });

  pgm.dropColumn('donors', 'first_name');
  pgm.dropColumn('donors', 'last_name');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('donors', {
    first_name: { type: 'text' },
    last_name: { type: 'text' },
  });

  pgm.sql(`
    UPDATE donors
       SET first_name = split_part(name, ' ', 1),
           last_name = COALESCE(
             NULLIF(
               BTRIM(REGEXP_REPLACE(name, '^\\s*[^\\s]+\\s*', '')),
               ''
             ),
             ''
           )
  `);

  pgm.alterColumn('donors', 'first_name', { notNull: true });
  pgm.alterColumn('donors', 'last_name', { notNull: true });

  pgm.dropConstraint('donors', UNIQUE_CONSTRAINT_NAME, { ifExists: true });

  pgm.dropColumn('donors', 'name');
}
