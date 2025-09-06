import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    "INSERT INTO volunteer_roles (id, name, category_id) VALUES (16, 'Donation Entry', 2) ON CONFLICT (id) DO NOTHING;"
  );
  pgm.sql(
    "SELECT setval('volunteer_roles_id_seq', (SELECT COALESCE(MAX(id),0) FROM volunteer_roles));"
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("DELETE FROM volunteer_roles WHERE id = 16 OR name = 'Donation Entry';");
  pgm.sql(
    "SELECT setval('volunteer_roles_id_seq', (SELECT COALESCE(MAX(id),0) FROM volunteer_roles));"
  );
}
