import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('clients', { consent: { type: 'boolean', notNull: true, default: false } });
  pgm.addColumn('staff', { consent: { type: 'boolean', notNull: true, default: false } });
  pgm.addColumn('volunteers', { consent: { type: 'boolean', notNull: true, default: false } });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('clients', 'consent');
  pgm.dropColumn('staff', 'consent');
  pgm.dropColumn('volunteers', 'consent');
}
