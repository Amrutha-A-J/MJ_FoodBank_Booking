import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','preapproved','cancelled','no_show','expired','visited')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('submitted','approved','rejected','preapproved','cancelled','no_show','expired','visited')",
  });
}
