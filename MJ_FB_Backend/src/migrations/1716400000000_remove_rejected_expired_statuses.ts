import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Remove existing records with deprecated statuses
  pgm.sql("DELETE FROM bookings WHERE status IN ('rejected','expired')");
  pgm.sql("DELETE FROM volunteer_bookings WHERE status IN ('rejected','expired')");

  // Drop and recreate status check constraints without deprecated values
  pgm.sql(
    "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check"
  );
  pgm.sql(
    "ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('approved','cancelled','no_show','visited'))"
  );

  pgm.sql(
    "ALTER TABLE volunteer_bookings DROP CONSTRAINT IF EXISTS volunteer_bookings_status_check"
  );
  pgm.sql(
    "ALTER TABLE volunteer_bookings ADD CONSTRAINT volunteer_bookings_status_check CHECK (status IN ('approved','cancelled','no_show','completed'))"
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check"
  );
  pgm.sql(
    "ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('approved','rejected','cancelled','no_show','expired','visited'))"
  );

  pgm.sql(
    "ALTER TABLE volunteer_bookings DROP CONSTRAINT IF EXISTS volunteer_bookings_status_check"
  );
  pgm.sql(
    "ALTER TABLE volunteer_bookings ADD CONSTRAINT volunteer_bookings_status_check CHECK (status IN ('approved','rejected','cancelled','no_show','expired','completed'))"
  );
}
