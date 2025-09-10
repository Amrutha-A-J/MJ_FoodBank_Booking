import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('pantry_weekly_overall', {
    people: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addColumn('pantry_monthly_overall', {
    people: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addColumn('pantry_yearly_overall', {
    people: { type: 'integer', notNull: true, default: 0 },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('pantry_yearly_overall', 'people');
  pgm.dropColumn('pantry_monthly_overall', 'people');
  pgm.dropColumn('pantry_weekly_overall', 'people');
}

