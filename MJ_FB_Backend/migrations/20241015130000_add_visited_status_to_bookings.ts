import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status = ANY (ARRAY['approved','rejected','cancelled','no_show','expired','visited'])",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert to state before the 'visited' status was introduced
  // Previously allowed statuses: approved, rejected, cancelled, no_show, expired
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status = ANY (ARRAY['approved','rejected','cancelled','no_show','expired'])",
  });
}
