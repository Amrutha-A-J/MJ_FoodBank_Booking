import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('donors', {
    phone: { type: 'text' },
  });

  pgm.addColumn('donations', {
    donor_id: { type: 'integer' },
  });
  pgm.addColumn('donor_aggregations', {
    donor_id: { type: 'integer' },
  });

  pgm.sql(`
    UPDATE donations d
    SET donor_id = o.id
    FROM donors o
    WHERE d.donor_email = o.email
  `);

  pgm.sql(`
    UPDATE donor_aggregations a
    SET donor_id = o.id
    FROM donors o
    WHERE a.donor_email = o.email
  `);

  pgm.alterColumn('donations', 'donor_id', { notNull: true });
  pgm.alterColumn('donor_aggregations', 'donor_id', { notNull: true });

  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_pkey');
  pgm.dropConstraint('donations', 'donations_donor_email_fkey');
  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_donor_email_fkey');
  pgm.dropIndex('donations', ['donor_email'], { name: 'donations_donor_email_idx' });

  pgm.dropColumn('donations', 'donor_email');
  pgm.dropColumn('donor_aggregations', 'donor_email');

  pgm.addConstraint('donor_aggregations', 'donor_aggregations_pkey', {
    primaryKey: ['year', 'month', 'donor_id'],
  });

  pgm.dropConstraint('donors', 'donors_pkey');
  pgm.addConstraint('donors', 'donors_pkey', { primaryKey: 'id' });
  pgm.dropConstraint('donors', 'donors_id_unique');
  pgm.alterColumn('donors', 'email', { notNull: false });
  pgm.createIndex('donors', ['email'], {
    name: 'donors_email_unique_idx',
    unique: true,
    where: 'email IS NOT NULL',
  });

  pgm.addConstraint('donations', 'donations_donor_id_fkey', {
    foreignKeys: {
      columns: 'donor_id',
      references: 'donors(id)',
    },
  });

  pgm.addConstraint('donor_aggregations', 'donor_aggregations_donor_id_fkey', {
    foreignKeys: {
      columns: 'donor_id',
      references: 'donors(id)',
    },
  });

  pgm.createIndex('donations', ['donor_id'], { name: 'donations_donor_id_idx' });

  pgm.sql(`
    UPDATE donors
    SET email = NULL
    WHERE email LIKE 'donor%@example.com'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    UPDATE donors
    SET email = CONCAT('donor', id, '@example.com')
    WHERE email IS NULL
  `);

  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_donor_id_fkey');
  pgm.dropConstraint('donations', 'donations_donor_id_fkey');

  pgm.dropIndex('donors', ['email'], { name: 'donors_email_unique_idx' });
  pgm.dropConstraint('donors', 'donors_pkey');
  pgm.addConstraint('donors', 'donors_id_unique', { unique: 'id' });
  pgm.alterColumn('donors', 'email', { notNull: true });
  pgm.addConstraint('donors', 'donors_pkey', { primaryKey: 'email' });

  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_pkey');
  pgm.addColumn('donor_aggregations', {
    donor_email: { type: 'text' },
  });
  pgm.sql(`
    UPDATE donor_aggregations a
    SET donor_email = o.email
    FROM donors o
    WHERE a.donor_id = o.id
  `);
  pgm.alterColumn('donor_aggregations', 'donor_email', { notNull: true });
  pgm.dropColumn('donor_aggregations', 'donor_id');
  pgm.addConstraint('donor_aggregations', 'donor_aggregations_donor_email_fkey', {
    foreignKeys: {
      columns: 'donor_email',
      references: 'donors(email)',
    },
  });
  pgm.addConstraint('donor_aggregations', 'donor_aggregations_pkey', {
    primaryKey: ['year', 'month', 'donor_email'],
  });

  pgm.addColumn('donations', {
    donor_email: { type: 'text' },
  });
  pgm.sql(`
    UPDATE donations d
    SET donor_email = o.email
    FROM donors o
    WHERE d.donor_id = o.id
  `);
  pgm.alterColumn('donations', 'donor_email', { notNull: true });
  pgm.dropIndex('donations', ['donor_id'], { name: 'donations_donor_id_idx' });
  pgm.dropColumn('donations', 'donor_id');
  pgm.addConstraint('donations', 'donations_donor_email_fkey', {
    foreignKeys: {
      columns: 'donor_email',
      references: 'donors(email)',
    },
  });
  pgm.createIndex('donations', ['donor_email'], { name: 'donations_donor_email_idx' });

  pgm.dropColumn('donors', 'phone');
}
