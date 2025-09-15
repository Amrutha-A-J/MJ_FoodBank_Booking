import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('volunteers', 'username', { ifExists: true });
  pgm.addConstraint('volunteers', 'volunteers_email_unique', { unique: ['email'] });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('volunteers', 'volunteers_email_unique');
  pgm.addColumn('volunteers', {
    username: { type: 'text', notNull: true },
  });
  pgm.addConstraint('volunteers', 'volunteers_username_unique', { unique: ['username'] });
}
