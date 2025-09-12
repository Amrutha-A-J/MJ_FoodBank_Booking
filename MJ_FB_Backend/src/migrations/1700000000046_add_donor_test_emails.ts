import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('donor_test_emails', {
    id: 'id',
    email: { type: 'text', notNull: true, unique: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('donor_test_emails');
}
