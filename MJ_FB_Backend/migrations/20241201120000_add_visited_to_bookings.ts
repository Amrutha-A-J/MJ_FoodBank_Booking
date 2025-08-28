import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','visited')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert to constraint prior to this migration; previous state included
  // 'visited' alongside other statuses
  // Previously: status IN ('approved','rejected','cancelled','no_show','expired','visited')
  pgm.dropConstraint('bookings', 'bookings_status_check');
  pgm.addConstraint('bookings', 'bookings_status_check', {
    check: "status IN ('approved','rejected','cancelled','no_show','expired','visited')",
  });
}
