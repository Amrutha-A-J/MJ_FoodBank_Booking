import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('client_visits', 'weight_with_cart', { notNull: false });
  pgm.alterColumn('client_visits', 'weight_without_cart', { notNull: false });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('client_visits', 'weight_with_cart', { notNull: true });
  pgm.alterColumn('client_visits', 'weight_without_cart', { notNull: true });
}
