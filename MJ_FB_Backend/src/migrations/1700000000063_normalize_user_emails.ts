import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("UPDATE staff SET email = NULLIF(LOWER(TRIM(email)), '') WHERE email IS NOT NULL;");
  pgm.sql("UPDATE volunteers SET email = NULLIF(LOWER(TRIM(email)), '') WHERE email IS NOT NULL;");
  pgm.sql("UPDATE clients SET email = NULLIF(LOWER(TRIM(email)), '') WHERE email IS NOT NULL;");
}

export async function down(): Promise<void> {}
