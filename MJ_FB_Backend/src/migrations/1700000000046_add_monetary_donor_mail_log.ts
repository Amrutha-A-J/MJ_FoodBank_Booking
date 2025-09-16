import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('monetary_donor_mail_log', {
    id: 'id',
    donor_id: {
      type: 'integer',
      notNull: true,
      references: 'monetary_donors',
      onDelete: 'CASCADE',
    },
    year: { type: 'integer', notNull: true },
    month: { type: 'integer', notNull: true },
    sent_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint(
    'monetary_donor_mail_log',
    'monetary_donor_mail_log_donor_year_month_unique',
    { unique: ['donor_id', 'year', 'month'] },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('monetary_donor_mail_log');
}
