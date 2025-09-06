import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('sunshine_bag_log', {
    client_count: { type: 'integer', notNull: true, default: 0 },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('sunshine_bag_log', 'client_count');
}
