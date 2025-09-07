import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('outgoing_donation_log', [
  "receiver_id",
  "date"
], {
    ifNotExists: true,
    name: 'outgoing_donation_log_receiver_date_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('outgoing_donation_log', [
  "receiver_id",
  "date"
], { name: 'outgoing_donation_log_receiver_date_idx' });
}
