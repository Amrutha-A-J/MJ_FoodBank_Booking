import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    'pantry_weekly_overall',
    {
      year: { type: 'integer', notNull: true },
      month: { type: 'integer', notNull: true, check: 'month BETWEEN 1 AND 12' },
      week: { type: 'integer', notNull: true, check: 'week BETWEEN 1 AND 6' },
      start_date: { type: 'date', notNull: true },
      end_date: { type: 'date', notNull: true },
      clients: { type: 'integer', notNull: true, default: 0 },
      adults: { type: 'integer', notNull: true, default: 0 },
      children: { type: 'integer', notNull: true, default: 0 },
      weight: { type: 'integer', notNull: true, default: 0 },
      sunshine_bags: { type: 'integer', notNull: true, default: 0 },
      sunshine_weight: { type: 'integer', notNull: true, default: 0 },
    },
    { constraints: { primaryKey: ['year', 'month', 'week'] } },
  );

  pgm.createTable(
    'pantry_monthly_overall',
    {
      year: { type: 'integer', notNull: true },
      month: { type: 'integer', notNull: true, check: 'month BETWEEN 1 AND 12' },
      clients: { type: 'integer', notNull: true, default: 0 },
      adults: { type: 'integer', notNull: true, default: 0 },
      children: { type: 'integer', notNull: true, default: 0 },
      weight: { type: 'integer', notNull: true, default: 0 },
      sunshine_bags: { type: 'integer', notNull: true, default: 0 },
      sunshine_weight: { type: 'integer', notNull: true, default: 0 },
    },
    { constraints: { primaryKey: ['year', 'month'] } },
  );

  pgm.createTable(
    'pantry_yearly_overall',
    {
      year: { type: 'integer', notNull: true },
      clients: { type: 'integer', notNull: true, default: 0 },
      adults: { type: 'integer', notNull: true, default: 0 },
      children: { type: 'integer', notNull: true, default: 0 },
      weight: { type: 'integer', notNull: true, default: 0 },
      sunshine_bags: { type: 'integer', notNull: true, default: 0 },
      sunshine_weight: { type: 'integer', notNull: true, default: 0 },
    },
    { constraints: { primaryKey: ['year'] } },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('pantry_yearly_overall');
  pgm.dropTable('pantry_monthly_overall');
  pgm.dropTable('pantry_weekly_overall');
}

