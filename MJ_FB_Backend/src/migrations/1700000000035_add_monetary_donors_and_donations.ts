import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('monetary_donors', {
    id: 'id',
    first_name: { type: 'text', notNull: true },
    last_name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
  });

  pgm.createTable('monetary_donations', {
    id: 'id',
    donor_id: { type: 'integer', notNull: true, references: 'monetary_donors' },
    date: { type: 'date', notNull: true },
    amount: { type: 'integer', notNull: true },
  });

  pgm.createIndex('monetary_donations', ['donor_id'], { name: 'monetary_donations_donor_id_idx' });
  pgm.createIndex('monetary_donations', ['date'], { name: 'monetary_donations_date_idx' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('monetary_donations');
  pgm.dropTable('monetary_donors');
}
