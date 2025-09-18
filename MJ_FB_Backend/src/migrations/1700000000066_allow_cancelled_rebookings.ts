import type { MigrationBuilder } from 'node-pg-migrate';

const INDEX_NAME = 'bookings_user_date_unique_active';
const CONSTRAINT_NAME = 'bookings_user_id_date_unique';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', CONSTRAINT_NAME, { ifExists: true });
  pgm.createIndex('bookings', ['user_id', 'date'], {
    name: INDEX_NAME,
    unique: true,
    where: "status <> 'cancelled'",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', ['user_id', 'date'], { name: INDEX_NAME, ifExists: true });
  pgm.addConstraint('bookings', CONSTRAINT_NAME, {
    unique: ['user_id', 'date'],
  });
}

