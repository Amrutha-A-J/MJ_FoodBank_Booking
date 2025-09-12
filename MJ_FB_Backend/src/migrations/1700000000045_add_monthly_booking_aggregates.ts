import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createMaterializedView(
    'monthly_client_visits',
    {},
    `SELECT client_id, DATE_TRUNC('month', date)::date AS month, COUNT(*) AS visits
     FROM client_visits
     GROUP BY client_id, DATE_TRUNC('month', date)::date`
  );
  pgm.createIndex('monthly_client_visits', ['client_id', 'month']);

  pgm.createMaterializedView(
    'monthly_approved_bookings',
    {},
    `SELECT user_id AS client_id, DATE_TRUNC('month', date)::date AS month, COUNT(*) AS approved
     FROM bookings
     WHERE status = 'approved'
     GROUP BY user_id, DATE_TRUNC('month', date)::date`
  );
  pgm.createIndex('monthly_approved_bookings', ['client_id', 'month']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropMaterializedView('monthly_approved_bookings');
  pgm.dropMaterializedView('monthly_client_visits');
}
