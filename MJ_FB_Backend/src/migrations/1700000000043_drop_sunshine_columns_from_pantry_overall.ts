import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('pantry_weekly_overall', ['sunshine_bags', 'sunshine_weight']);
  pgm.dropColumns('pantry_monthly_overall', ['sunshine_bags', 'sunshine_weight']);
  pgm.dropColumns('pantry_yearly_overall', ['sunshine_bags', 'sunshine_weight']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('pantry_weekly_overall', {
    sunshine_bags: { type: 'integer', notNull: true, default: 0 },
    sunshine_weight: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addColumns('pantry_monthly_overall', {
    sunshine_bags: { type: 'integer', notNull: true, default: 0 },
    sunshine_weight: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addColumns('pantry_yearly_overall', {
    sunshine_bags: { type: 'integer', notNull: true, default: 0 },
    sunshine_weight: { type: 'integer', notNull: true, default: 0 },
  });
}

