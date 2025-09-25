import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('pantry_weekly_overall', 'anonymous_orders', { ifExists: true });
  pgm.dropColumn('pantry_weekly_overall', 'anonymous_adults', { ifExists: true });
  pgm.dropColumn('pantry_weekly_overall', 'anonymous_children', { ifExists: true });
  pgm.dropColumn('pantry_weekly_overall', 'anonymous_people', { ifExists: true });
  pgm.dropColumn('pantry_weekly_overall', 'anonymous_weight', { ifExists: true });

  pgm.dropColumn('pantry_monthly_overall', 'anonymous_orders', { ifExists: true });
  pgm.dropColumn('pantry_monthly_overall', 'anonymous_adults', { ifExists: true });
  pgm.dropColumn('pantry_monthly_overall', 'anonymous_children', { ifExists: true });
  pgm.dropColumn('pantry_monthly_overall', 'anonymous_people', { ifExists: true });
  pgm.dropColumn('pantry_monthly_overall', 'anonymous_weight', { ifExists: true });

  pgm.dropColumn('pantry_yearly_overall', 'anonymous_orders', { ifExists: true });
  pgm.dropColumn('pantry_yearly_overall', 'anonymous_adults', { ifExists: true });
  pgm.dropColumn('pantry_yearly_overall', 'anonymous_children', { ifExists: true });
  pgm.dropColumn('pantry_yearly_overall', 'anonymous_people', { ifExists: true });
  pgm.dropColumn('pantry_yearly_overall', 'anonymous_weight', { ifExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('pantry_weekly_overall', {
    anonymous_orders: { type: 'integer', notNull: true, default: 0 },
    anonymous_adults: { type: 'integer', notNull: true, default: 0 },
    anonymous_children: { type: 'integer', notNull: true, default: 0 },
    anonymous_people: { type: 'integer', notNull: true, default: 0 },
    anonymous_weight: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.addColumn('pantry_monthly_overall', {
    anonymous_orders: { type: 'integer', notNull: true, default: 0 },
    anonymous_adults: { type: 'integer', notNull: true, default: 0 },
    anonymous_children: { type: 'integer', notNull: true, default: 0 },
    anonymous_people: { type: 'integer', notNull: true, default: 0 },
    anonymous_weight: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.addColumn('pantry_yearly_overall', {
    anonymous_orders: { type: 'integer', notNull: true, default: 0 },
    anonymous_adults: { type: 'integer', notNull: true, default: 0 },
    anonymous_children: { type: 'integer', notNull: true, default: 0 },
    anonymous_people: { type: 'integer', notNull: true, default: 0 },
    anonymous_weight: { type: 'integer', notNull: true, default: 0 },
  });
}
