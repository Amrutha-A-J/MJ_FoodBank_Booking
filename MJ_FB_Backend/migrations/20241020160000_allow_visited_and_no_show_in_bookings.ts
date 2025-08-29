import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Previous constraint is expected to only allow
  // ('approved','rejected','cancelled','expired')
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','visited')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Constraint should currently include
  // ('approved','rejected','cancelled','no_show','expired','visited')
  // Restore the prior definition without 'no_show' and 'visited'
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','expired')",
  });
}
