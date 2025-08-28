import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('client_email_verifications', {
    id: 'id',
    client_id: {
      type: 'integer',
      notNull: true,
      references: 'clients',
      onDelete: 'CASCADE',
      unique: true,
    },
    email: { type: 'text', notNull: true },
    otp_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamp', notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('client_email_verifications');
}
