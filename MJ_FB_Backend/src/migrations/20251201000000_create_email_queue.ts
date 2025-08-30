import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('email_queue', {
    id: 'id',
    to: { type: 'text', notNull: true },
    subject: { type: 'text', notNull: true },
    body: { type: 'text', notNull: true },
    retries: { type: 'integer', notNull: true, default: 0 },
    next_attempt: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('email_queue');
}

