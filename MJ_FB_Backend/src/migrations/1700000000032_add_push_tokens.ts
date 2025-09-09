import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('push_tokens', {
    id: 'id',
    user_id: { type: 'integer', notNull: true },
    role: { type: 'text', notNull: true },
    token: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('push_tokens', 'push_tokens_token_key', { unique: ['token'] });
  pgm.createIndex('push_tokens', ['user_id', 'role']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('push_tokens');
}
