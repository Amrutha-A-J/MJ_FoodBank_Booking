import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP VIEW IF EXISTS user_lookup;');
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS staff_email_lower_idx ON staff (LOWER(email));');
  pgm.sql('DROP INDEX IF EXISTS agencies_email_lower_idx;');
  pgm.sql("DELETE FROM password_setup_tokens WHERE user_type = 'agencies';");
  pgm.dropTable('agency_clients', { ifExists: true });
  pgm.dropTable('agencies', { ifExists: true });
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
  pgm.createTable('agencies', {
    id: 'id',
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
    password: { type: 'text' },
    contact_info: { type: 'text' },
    consent: { type: 'boolean', notNull: true, default: false },
  });
  pgm.createTable('agency_clients', {
    id: 'id',
    agency_id: {
      type: 'integer',
      notNull: true,
      references: 'agencies',
      onDelete: 'CASCADE',
    },
    client_id: {
      type: 'bigint',
      notNull: true,
      references: 'clients',
      onDelete: 'CASCADE',
    },
  });
  pgm.addConstraint('agency_clients', 'agency_clients_agency_client_unique', {
    unique: ['agency_id', 'client_id'],
  });
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS agencies_email_lower_idx ON agencies (LOWER(email));');
  pgm.sql(`
    CREATE VIEW user_lookup AS
    SELECT id, email, 'staff' AS user_type, 1 AS ord FROM staff
    UNION ALL
    SELECT id, email, 'volunteers' AS user_type, 2 AS ord FROM volunteers
    UNION ALL
    SELECT id, email, 'agencies' AS user_type, 3 AS ord FROM agencies
    UNION ALL
    SELECT client_id AS id, email, 'clients' AS user_type, 4 AS ord FROM clients;
  `);
}
