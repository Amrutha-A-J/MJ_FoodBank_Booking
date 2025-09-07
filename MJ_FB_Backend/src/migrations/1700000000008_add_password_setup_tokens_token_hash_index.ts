import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('password_setup_tokens', [
  "token_hash"
], {
    unique: true,
    ifNotExists: true,
    name: 'password_setup_tokens_token_hash_idx'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('password_setup_tokens', [
  "token_hash"
], { name: 'password_setup_tokens_token_hash_idx' });
}
