import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('refresh_tokens', 'refresh_tokens_subject_key', { ifExists: true });
  pgm.addColumn('refresh_tokens', {
    expires_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP + INTERVAL '7 days'"),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('refresh_tokens', 'expires_at');
  pgm.addConstraint('refresh_tokens', 'refresh_tokens_subject_key', {
    unique: ['subject'],
  });
}
