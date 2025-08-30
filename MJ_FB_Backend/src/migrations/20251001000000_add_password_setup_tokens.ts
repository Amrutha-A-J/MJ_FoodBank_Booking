import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('password_setup_tokens', {
    id: 'id',
    user_type: { type: 'text', notNull: true },
    user_id: { type: 'integer', notNull: true },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamp', notNull: true },
    used: { type: 'boolean', notNull: true, default: false },
  });

  pgm.alterColumn('clients', 'password', { notNull: false });
  pgm.alterColumn('volunteers', 'password', { notNull: false });
  pgm.alterColumn('staff', 'password', { notNull: false });
  pgm.alterColumn('agencies', 'password', { notNull: false });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('clients', 'password', { notNull: true });
  pgm.alterColumn('volunteers', 'password', { notNull: true });
  pgm.alterColumn('staff', 'password', { notNull: true });
  pgm.alterColumn('agencies', 'password', { notNull: true });

  pgm.dropTable('password_setup_tokens');
}
