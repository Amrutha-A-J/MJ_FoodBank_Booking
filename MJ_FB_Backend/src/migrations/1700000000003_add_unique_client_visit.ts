import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addConstraint('client_visits', 'client_visits_client_date_unique', {
    unique: ['date', 'client_id'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('client_visits', 'client_visits_client_date_unique');
}
