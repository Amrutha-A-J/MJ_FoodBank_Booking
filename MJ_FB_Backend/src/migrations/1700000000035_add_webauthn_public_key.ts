import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('webauthn_credentials', {
    public_key: { type: 'text', notNull: true, default: '' },
    sign_count: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.alterColumn('webauthn_credentials', 'public_key', { default: null });
  pgm.alterColumn('webauthn_credentials', 'sign_count', { default: null });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('webauthn_credentials', ['public_key', 'sign_count']);
}
