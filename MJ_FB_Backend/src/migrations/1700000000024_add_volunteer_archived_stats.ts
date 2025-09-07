import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('volunteers', {
    archived_hours: { type: 'numeric', notNull: true, default: 0 },
    archived_shifts: { type: 'integer', notNull: true, default: 0 },
    archived_bookings: { type: 'integer', notNull: true, default: 0 },
    archived_no_shows: { type: 'integer', notNull: true, default: 0 },
    has_early_bird: { type: 'boolean', notNull: true, default: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('volunteers', [
    'archived_hours',
    'archived_shifts',
    'archived_bookings',
    'archived_no_shows',
    'has_early_bird',
  ]);
}
