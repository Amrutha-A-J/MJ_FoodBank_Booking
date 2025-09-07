import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('email_queue', [
  "next_attempt"
], {
    ifNotExists: true,
    name: 'email_queue_next_attempt_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('email_queue', [
  "next_attempt"
], { name: 'email_queue_next_attempt_idx' });
}
