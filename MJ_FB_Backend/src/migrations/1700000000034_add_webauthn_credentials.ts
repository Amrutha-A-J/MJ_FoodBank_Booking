import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('webauthn_credentials', {
    user_identifier: { type: 'text', primaryKey: true },
    credential_id: { type: 'text', notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('webauthn_credentials');
}
