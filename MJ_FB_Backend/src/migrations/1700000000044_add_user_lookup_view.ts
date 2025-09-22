import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS staff_email_lower_idx ON staff (LOWER(email));`);
  pgm.sql(`
    CREATE VIEW user_lookup AS
    SELECT id, email, 'staff' AS user_type, 1 AS ord FROM staff
    UNION ALL
    SELECT id, email, 'volunteers' AS user_type, 2 AS ord FROM volunteers
    UNION ALL
    SELECT client_id AS id, email, 'clients' AS user_type, 3 AS ord FROM clients;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP VIEW IF EXISTS user_lookup;');
  pgm.sql('DROP INDEX IF EXISTS staff_email_lower_idx;');
}
