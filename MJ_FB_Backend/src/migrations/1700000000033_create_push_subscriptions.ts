import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('push_subscriptions', {
    id: 'id',
    user_id: { type: 'integer', notNull: true },
    user_role: { type: 'text', notNull: true },
    subscription: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('push_subscriptions', ['user_id', 'user_role']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('push_subscriptions');
}
