import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    "INSERT INTO app_config (key, value) VALUES ('maintenance_mode', 'false') ON CONFLICT (key) DO NOTHING",
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("DELETE FROM app_config WHERE key IN ('maintenance_mode','maintenance_notice')");
}
