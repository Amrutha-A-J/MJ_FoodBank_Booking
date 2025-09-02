import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('leave_requests', {
    id: 'id',
    staff_id: { type: 'integer', notNull: true, references: 'staff' },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date', notNull: true },
    reason: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'pending' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    decided_at: { type: 'timestamptz' },
  });

  pgm.createTable('email_outbox', {
    id: 'id',
    recipient: { type: 'text', notNull: true },
    subject: { type: 'text', notNull: true },
    body: { type: 'text', notNull: true },
    queued_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('email_outbox');
  pgm.dropTable('leave_requests');
}
