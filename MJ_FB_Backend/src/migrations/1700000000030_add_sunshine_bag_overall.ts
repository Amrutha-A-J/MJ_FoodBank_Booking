import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    'sunshine_bag_overall',
    {
      year: { type: 'integer', notNull: true },
      month: { type: 'integer', notNull: true, check: 'month BETWEEN 1 AND 12' },
      weight: { type: 'integer', notNull: true, default: 0 },
      client_count: { type: 'integer', notNull: true, default: 0 },
    },
    { constraints: { primaryKey: ['year', 'month'] } },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('sunshine_bag_overall');
}
