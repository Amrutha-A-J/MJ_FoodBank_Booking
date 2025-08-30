import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("UPDATE volunteer_bookings SET status='approved' WHERE status='pending'");
  pgm.alterColumn('volunteer_bookings', 'status', { default: 'approved' });
  pgm.dropConstraint('volunteer_bookings', 'volunteer_bookings_status_check', { ifExists: true });
  pgm.addConstraint('volunteer_bookings', 'volunteer_bookings_status_check', {
    check: "status IN ('approved', 'rejected', 'cancelled', 'no_show', 'expired')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('volunteer_bookings', 'status', { default: 'pending' });
  pgm.dropConstraint('volunteer_bookings', 'volunteer_bookings_status_check', { ifExists: true });
  pgm.addConstraint('volunteer_bookings', 'volunteer_bookings_status_check', {
    check: "status IN ('pending', 'approved', 'rejected', 'cancelled', 'no_show', 'expired')",
  });
  pgm.sql("UPDATE volunteer_bookings SET status='pending' WHERE status='approved'");
}
