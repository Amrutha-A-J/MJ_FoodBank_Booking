import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("DELETE FROM bookings WHERE status IN ('rejected','expired');");
  pgm.sql("DELETE FROM volunteer_bookings WHERE status IN ('rejected','expired');");

  pgm.dropConstraint('bookings', 'bookings_status_check', { ifExists: true });
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','cancelled','no_show','visited')",
  });

  pgm.dropConstraint('volunteer_bookings', 'volunteer_bookings_status_check', { ifExists: true });
  pgm.addConstraint('volunteer_bookings', 'volunteer_bookings_status_check', {
    check: "status IN ('approved','cancelled','no_show','completed')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('volunteer_bookings', 'volunteer_bookings_status_check', { ifExists: true });
  pgm.addConstraint('volunteer_bookings', 'volunteer_bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','completed')",
  });

  pgm.dropConstraint('bookings', 'bookings_status_check', { ifExists: true });
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','visited')",
  });
}
