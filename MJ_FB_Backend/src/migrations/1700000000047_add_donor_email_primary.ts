import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('donors', {
    first_name: { type: 'text' },
    last_name: { type: 'text' },
    email: { type: 'text' },
  });

  pgm.sql(`
    UPDATE donors
    SET first_name = split_part(name, ' ', 1),
        last_name = COALESCE(
          NULLIF(BTRIM(REGEXP_REPLACE(name, '^\\S+\\s*', '')), ''),
          ''
        ),
        email = CONCAT('donor', id, '@example.com')
  `);

  pgm.alterColumn('donors', 'first_name', { notNull: true });
  pgm.alterColumn('donors', 'last_name', { notNull: true });
  pgm.alterColumn('donors', 'email', { notNull: true });
  pgm.addColumn('donations', { donor_email: { type: 'text' } });
  pgm.sql(`
    UPDATE donations d
    SET donor_email = o.email
    FROM donors o
    WHERE d.donor_id = o.id
  `);
  pgm.alterColumn('donations', 'donor_email', { notNull: true });

  pgm.addColumn('donor_aggregations', { donor_email: { type: 'text' } });
  pgm.sql(`
    UPDATE donor_aggregations a
    SET donor_email = o.email
    FROM donors o
    WHERE a.donor_id = o.id
  `);
  pgm.alterColumn('donor_aggregations', 'donor_email', { notNull: true });

  pgm.dropConstraint('donations', 'donations_donor_id_fkey');
  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_donor_id_fkey');

  pgm.dropConstraint('donors', 'donors_pkey');
  pgm.addConstraint('donors', 'donors_id_unique', { unique: 'id' });
  pgm.addConstraint('donors', 'donors_pkey', { primaryKey: 'email' });

  pgm.dropColumn('donors', 'name');

  pgm.dropIndex('donations', ['donor_id'], { name: 'donations_donor_id_idx' });
  pgm.dropColumn('donations', 'donor_id');
  pgm.addConstraint('donations', 'donations_donor_email_fkey', {
    foreignKeys: {
      columns: 'donor_email',
      references: 'donors(email)',
    },
  });
  pgm.createIndex('donations', ['donor_email'], { name: 'donations_donor_email_idx' });

  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_pkey');
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
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('donations', { donor_id: { type: 'integer' } });
  pgm.sql(`
    UPDATE donations d
    SET donor_id = o.id
    FROM donors o
    WHERE d.donor_email = o.email
  `);
  pgm.alterColumn('donations', 'donor_id', { notNull: true });

  pgm.addColumn('donor_aggregations', { donor_id: { type: 'integer' } });
  pgm.sql(`
    UPDATE donor_aggregations a
    SET donor_id = o.id
    FROM donors o
    WHERE a.donor_email = o.email
  `);
  pgm.alterColumn('donor_aggregations', 'donor_id', { notNull: true });

  pgm.dropConstraint('donations', 'donations_donor_email_fkey');
  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_donor_email_fkey');

  pgm.addColumn('donors', { name: { type: 'text' } });
  pgm.sql(`
    UPDATE donors
    SET name = CONCAT(first_name, ' ', last_name)
  `);
  pgm.alterColumn('donors', 'name', { notNull: true });

  pgm.dropConstraint('donors', 'donors_pkey');
  pgm.dropConstraint('donors', 'donors_id_unique');
  pgm.addConstraint('donors', 'donors_pkey', { primaryKey: 'id' });
  pgm.addConstraint('donors', 'donors_name_unique', { unique: 'name' });
  pgm.dropColumn('donors', 'first_name');
  pgm.dropColumn('donors', 'last_name');
  pgm.dropColumn('donors', 'email');

  pgm.dropIndex('donations', ['donor_email'], { name: 'donations_donor_email_idx' });
  pgm.dropColumn('donations', 'donor_email');
  pgm.addConstraint('donations', 'donations_donor_id_fkey', {
    foreignKeys: {
      columns: 'donor_id',
      references: 'donors(id)',
    },
  });
  pgm.createIndex('donations', ['donor_id'], { name: 'donations_donor_id_idx' });

  pgm.dropConstraint('donor_aggregations', 'donor_aggregations_pkey');
  pgm.dropColumn('donor_aggregations', 'donor_email');
  pgm.addConstraint('donor_aggregations', 'donor_aggregations_donor_id_fkey', {
    foreignKeys: {
      columns: 'donor_id',
      references: 'donors(id)',
    },
  });
  pgm.addConstraint('donor_aggregations', 'donor_aggregations_pkey', {
    primaryKey: ['year', 'month', 'donor_id'],
  });
}

