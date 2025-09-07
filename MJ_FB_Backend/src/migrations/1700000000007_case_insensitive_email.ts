import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('volunteers', 'volunteers_email_unique');
  pgm.sql(
    `CREATE UNIQUE INDEX volunteers_email_lower_idx ON volunteers (LOWER(email));`,
  );

  pgm.dropConstraint('clients', 'clients_email_key');
  pgm.sql(
    `CREATE UNIQUE INDEX clients_email_lower_idx ON clients (LOWER(email));`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP INDEX IF EXISTS clients_email_lower_idx;');
  pgm.addConstraint('clients', 'clients_email_key', { unique: ['email'] });

  pgm.sql('DROP INDEX IF EXISTS volunteers_email_lower_idx;');
  pgm.addConstraint('volunteers', 'volunteers_email_unique', { unique: ['email'] });
}

