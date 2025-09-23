import { newDb } from 'pg-mem';

describe('donor name migrations', () => {
  it('preserves multi-word donor names through email/name migrations', () => {
    const db = newDb({ autoCreateForeignKeyIndices: false });
    db.public.registerFunction<{ value: string | null; delim: string; field: number }, string>({
      name: 'split_part',
      args: ['text', 'text', 'int4'],
      returns: 'text',
      implementation: (value, delim, field) => {
        if (value == null) {
          return null;
        }
        const parts = value.split(delim);
        return parts[field - 1] ?? '';
      },
    });
    db.public.registerFunction({
      name: 'regexp_replace',
      args: ['text', 'text', 'text'],
      returns: 'text',
      implementation: (value: string | null, pattern: string, replacement: string) => {
        if (value == null) {
          return null;
        }
        const regex = new RegExp(pattern, 'g');
        return value.replace(regex, replacement);
      },
    });
    db.public.registerFunction({
      name: 'btrim',
      args: ['text'],
      returns: 'text',
      implementation: (value: string | null) => (value ?? '').trim(),
    });
    db.public.registerFunction({
      name: 'nullif',
      args: ['text', 'text'],
      returns: 'text',
      implementation: (value: string | null, match: string | null) => {
        if (value == null) {
          return null;
        }
        return value === match ? null : value;
      },
    });
    db.public.registerFunction({
      name: 'concat',
      args: ['text', 'int4', 'text'],
      returns: 'text',
      implementation: (prefix: string | null, num: number | null, suffix: string | null) => {
        return `${prefix ?? ''}${num ?? ''}${suffix ?? ''}`;
      },
    });
    db.public.registerFunction({
      name: 'concat',
      args: ['text', 'int4'],
      returns: 'text',
      implementation: (prefix: string | null, num: number | null) => {
        return `${prefix ?? ''}${num ?? ''}`;
      },
    });
    db.public.registerFunction({
      name: 'concat_ws',
      args: ['text', 'text', 'text'],
      returns: 'text',
      implementation: (separator: string | null, first: string | null, second: string | null) => {
        const sep = separator ?? '';
        const parts = [] as string[];
        if (first != null) {
          parts.push(first);
        }
        if (second != null) {
          parts.push(second);
        }
        return parts.join(sep);
      },
    });
    const publicSchema = db.public;

    publicSchema.none(`
      CREATE TABLE donors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    publicSchema.none(`
      CREATE TABLE donations (
        id SERIAL PRIMARY KEY,
        donor_id INTEGER NOT NULL,
        date DATE NOT NULL,
        weight INTEGER NOT NULL,
        CONSTRAINT donations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES donors(id)
      );
    `);

    publicSchema.none(`
      CREATE TABLE donor_aggregations (
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        donor_id INTEGER NOT NULL,
        total INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT donor_aggregations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES donors(id),
        PRIMARY KEY (year, month, donor_id)
      );
    `);

    publicSchema.none(`
      CREATE INDEX donations_donor_id_idx ON donations (donor_id);
    `);

    const donorNames = [
      'Moose Jaw Food Bank',
      'St. Andrew Church',
      'City of Moose Jaw'
    ];

    donorNames.forEach((name, index) => {
      const sanitized = name.replace(/'/g, "''");
      publicSchema.none(
        `INSERT INTO donors (id, name) VALUES (${index + 1}, '${sanitized}');`,
      );
    });

    publicSchema.none(`
      INSERT INTO donations (donor_id, date, weight)
      VALUES (1, DATE '2024-01-01', 100),
             (2, DATE '2024-01-02', 200);
    `);

    publicSchema.none(`
      INSERT INTO donor_aggregations (year, month, donor_id, total)
      VALUES (2024, 1, 1, 100),
             (2024, 1, 2, 200);
    `);

    // Apply the logic from 1700000000047_add_donor_email_primary.ts (updated expression)
    publicSchema.none(`ALTER TABLE donors ADD COLUMN first_name TEXT;`);
    publicSchema.none(`ALTER TABLE donors ADD COLUMN last_name TEXT;`);
    publicSchema.none(`ALTER TABLE donors ADD COLUMN email TEXT;`);

    publicSchema.none(`
      UPDATE donors
         SET first_name = split_part(name, ' ', 1),
             last_name = COALESCE(
               NULLIF(BTRIM(REGEXP_REPLACE(name, '^\\S+\\s*', '')), ''),
               ''
             ),
             email = CONCAT('donor', id, '@example.com');
    `);

    publicSchema.none(`ALTER TABLE donors ALTER COLUMN first_name SET NOT NULL;`);
    publicSchema.none(`ALTER TABLE donors ALTER COLUMN last_name SET NOT NULL;`);
    publicSchema.none(`ALTER TABLE donors ALTER COLUMN email SET NOT NULL;`);

    publicSchema.none(`ALTER TABLE donations ADD COLUMN donor_email TEXT;`);
    publicSchema.none(`
      UPDATE donations
         SET donor_email = donors.email
        FROM donors
       WHERE donations.donor_id = donors.id;
    `);
    publicSchema.none(`ALTER TABLE donations ALTER COLUMN donor_email SET NOT NULL;`);

    publicSchema.none(`ALTER TABLE donor_aggregations ADD COLUMN donor_email TEXT;`);
    publicSchema.none(`
      UPDATE donor_aggregations
         SET donor_email = donors.email
        FROM donors
       WHERE donor_aggregations.donor_id = donors.id;
    `);
    publicSchema.none(`ALTER TABLE donor_aggregations ALTER COLUMN donor_email SET NOT NULL;`);

    publicSchema.none(`ALTER TABLE donations DROP CONSTRAINT donations_donor_id_fkey;`);
    publicSchema.none(`ALTER TABLE donor_aggregations DROP CONSTRAINT donor_aggregations_donor_id_fkey;`);

    publicSchema.none(`ALTER TABLE donors DROP CONSTRAINT donors_pkey;`);
    publicSchema.none(`ALTER TABLE donors ADD CONSTRAINT donors_id_unique UNIQUE (id);`);
    publicSchema.none(`ALTER TABLE donors ADD CONSTRAINT donors_pkey PRIMARY KEY (email);`);

    publicSchema.none(`ALTER TABLE donors DROP COLUMN name;`);

    publicSchema.none(`DROP INDEX donations_donor_id_idx;`);
    publicSchema.none(`ALTER TABLE donations DROP COLUMN donor_id;`);
    publicSchema.none(`
      ALTER TABLE donations
        ADD CONSTRAINT donations_donor_email_fkey
        FOREIGN KEY (donor_email) REFERENCES donors(email);
    `);
    publicSchema.none(`
      CREATE INDEX donations_donor_email_idx ON donations (donor_email);
    `);

    publicSchema.none(`ALTER TABLE donor_aggregations DROP CONSTRAINT donor_aggregations_pkey;`);
    publicSchema.none(`ALTER TABLE donor_aggregations DROP COLUMN donor_id;`);
    publicSchema.none(`
      ALTER TABLE donor_aggregations
        ADD CONSTRAINT donor_aggregations_donor_email_fkey
        FOREIGN KEY (donor_email) REFERENCES donors(email);
    `);
    publicSchema.none(`
      ALTER TABLE donor_aggregations
        ADD CONSTRAINT donor_aggregations_pkey
        PRIMARY KEY (year, month, donor_email);
    `);

    const nameParts = publicSchema.many<{ last_name: string }>(`
      SELECT last_name FROM donors ORDER BY id;
    `);
    expect(nameParts.map(row => row.last_name)).toEqual([
      'Jaw Food Bank',
      'Andrew Church',
      'of Moose Jaw'
    ]);

    // Apply the repair migration logic (1700000000069_repair_donor_names.ts)
    const hasNameColumn = publicSchema
      .one<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'donors'
             AND column_name = 'name'
        ) AS exists;
      `)
      .exists;
    const hasFirstNameColumn = publicSchema
      .one<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'donors'
             AND column_name = 'first_name'
        ) AS exists;
      `)
      .exists;
    const hasLastNameColumn = publicSchema
      .one<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'donors'
             AND column_name = 'last_name'
        ) AS exists;
      `)
      .exists;

    if (hasNameColumn && hasLastNameColumn) {
      publicSchema.none(`
        UPDATE donors
           SET last_name = COALESCE(
             NULLIF(BTRIM(REGEXP_REPLACE(name, '^\\S+\\s*', '')), ''),
             ''
           );
      `);
    }

    if (hasNameColumn && hasFirstNameColumn && hasLastNameColumn) {
      publicSchema.none(`
        UPDATE donors
           SET name = COALESCE(
             NULLIF(
               BTRIM(
                 CONCAT_WS(
                   ' ',
                   NULLIF(BTRIM(first_name), ''),
                   NULLIF(BTRIM(last_name), '')
                 )
               ),
               ''
             ),
             name
           );
      `);
    }

    // Apply the logic from 1700000000068_add_name_to_donors.ts needed for verification
    publicSchema.none(`ALTER TABLE donors ADD COLUMN name TEXT;`);
    publicSchema.none(`
      UPDATE donors
         SET name = COALESCE(
           NULLIF(
             BTRIM(
               CONCAT_WS(
                 ' ',
                 NULLIF(BTRIM(first_name), ''),
                 NULLIF(BTRIM(last_name), '')
               )
             ),
             ''
           ),
           CONCAT('Donor ', id)
         );
    `);
    publicSchema.none(`ALTER TABLE donors ALTER COLUMN name SET NOT NULL;`);
    publicSchema.none(`ALTER TABLE donors DROP COLUMN first_name;`);
    publicSchema.none(`ALTER TABLE donors DROP COLUMN last_name;`);

    const finalNames = publicSchema.many<{ name: string }>(`
      SELECT name FROM donors ORDER BY id;
    `);

    expect(finalNames.map(row => row.name)).toEqual(donorNames);
  });
});
