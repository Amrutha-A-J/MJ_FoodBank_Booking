import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('sunshine_bag_log', {
    date: { type: 'date', primaryKey: true },
    weight: { type: 'integer', notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('sunshine_bag_log');
}
