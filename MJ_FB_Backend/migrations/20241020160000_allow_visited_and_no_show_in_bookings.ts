import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','visited')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Restore constraint from previous migration which already allowed
  // 'no_show' and 'visited'
  // Previously: status = ANY (ARRAY['approved','rejected','cancelled','no_show','expired','visited'])
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status = ANY (ARRAY['approved','rejected','cancelled','no_show','expired','visited'])",
  });
}
