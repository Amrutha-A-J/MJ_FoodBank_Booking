import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('messages', {
    id: 'id',
    volunteer_id: { type: 'integer', notNull: true },
    sender_role: { type: 'text', notNull: true },
    body: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('messages', ['volunteer_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('messages');
}
