import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.renameColumn('pantry_weekly_overall', 'clients', 'orders');
  pgm.renameColumn('pantry_monthly_overall', 'clients', 'orders');
  pgm.renameColumn('pantry_yearly_overall', 'clients', 'orders');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.renameColumn('pantry_yearly_overall', 'orders', 'clients');
  pgm.renameColumn('pantry_monthly_overall', 'orders', 'clients');
  pgm.renameColumn('pantry_weekly_overall', 'orders', 'clients');
}
