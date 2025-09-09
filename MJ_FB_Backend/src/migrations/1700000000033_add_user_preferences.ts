import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('user_preferences', {
    user_id: { type: 'integer', notNull: true },
    user_type: { type: 'text', notNull: true },
    email_reminders: { type: 'boolean', notNull: true, default: true },
    push_notifications: { type: 'boolean', notNull: true, default: true },
  });
  pgm.createPrimaryKey('user_preferences', ['user_id', 'user_type']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('user_preferences');
}
