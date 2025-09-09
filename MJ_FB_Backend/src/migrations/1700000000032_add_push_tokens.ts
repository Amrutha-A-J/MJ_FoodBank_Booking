import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('push_tokens', {
    id: 'id',
    user_id: { type: 'integer', notNull: true },
    user_role: { type: 'text', notNull: true },
    token: { type: 'text', notNull: true, unique: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('push_tokens', ['user_id', 'user_role']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('push_tokens');
}
