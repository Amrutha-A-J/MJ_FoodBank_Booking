import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addConstraint('bookings', 'bookings_user_id_date_unique', {
    unique: ['user_id', 'date'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_user_id_date_unique');
}
