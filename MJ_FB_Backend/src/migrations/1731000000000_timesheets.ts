import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('timesheets', {
    id: 'id',
    volunteer_id: {
      type: 'integer',
      notNull: true,
      references: 'volunteers',
      onDelete: 'CASCADE',
    },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date', notNull: true },
    submitted_at: { type: 'timestamp' },
    approved_at: { type: 'timestamp' },
  });

  pgm.addConstraint(
    'timesheets',
    'timesheets_volunteer_period_unique',
    'UNIQUE(volunteer_id, start_date, end_date)',
  );

  pgm.createTable('timesheet_days', {
    id: 'id',
    timesheet_id: {
      type: 'integer',
      notNull: true,
      references: 'timesheets',
      onDelete: 'CASCADE',
    },
    work_date: { type: 'date', notNull: true },
    expected_hours: { type: 'integer', notNull: true },
    actual_hours: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.addConstraint(
    'timesheet_days',
    'timesheet_days_timesheet_date_unique',
    'UNIQUE(timesheet_id, work_date)',
  );

  pgm.sql(`
    CREATE VIEW v_timesheet_totals AS
      SELECT t.id AS timesheet_id,
             COALESCE(SUM(td.actual_hours), 0) AS total_hours
        FROM timesheets t
        LEFT JOIN timesheet_days td ON td.timesheet_id = t.id
       GROUP BY t.id;
  `);

  pgm.sql(`
    CREATE VIEW v_timesheet_expected AS
      SELECT t.id AS timesheet_id,
             COALESCE(SUM(td.expected_hours), 0) AS expected_hours
        FROM timesheets t
        LEFT JOIN timesheet_days td ON td.timesheet_id = t.id
       GROUP BY t.id;
  `);

  pgm.sql(`
    CREATE VIEW v_timesheet_balance AS
      SELECT t.id AS timesheet_id,
             COALESCE(SUM(td.actual_hours - td.expected_hours), 0) AS balance_hours
        FROM timesheets t
        LEFT JOIN timesheet_days td ON td.timesheet_id = t.id
       GROUP BY t.id;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_timesheet_day_rules()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.actual_hours < 0 THEN
        RAISE EXCEPTION 'actual_hours cannot be negative';
      END IF;
      IF NEW.expected_hours < 0 THEN
        RAISE EXCEPTION 'expected_hours cannot be negative';
      END IF;
      IF NEW.actual_hours > NEW.expected_hours THEN
        RAISE EXCEPTION 'actual_hours cannot exceed expected_hours';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER trg_timesheet_day_rules
    BEFORE INSERT OR UPDATE ON timesheet_days
    FOR EACH ROW EXECUTE FUNCTION trg_timesheet_day_rules();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION validate_timesheet_balance(p_timesheet_id integer)
    RETURNS void AS $$
    DECLARE v_balance integer;
    BEGIN
      SELECT COALESCE(SUM(actual_hours - expected_hours), 0)
        INTO v_balance
        FROM timesheet_days
       WHERE timesheet_id = p_timesheet_id;

      IF v_balance <> 0 THEN
        RAISE EXCEPTION 'Timesheet % is unbalanced by % hours', p_timesheet_id, v_balance;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP FUNCTION IF EXISTS validate_timesheet_balance(integer);');
  pgm.sql('DROP TRIGGER IF EXISTS trg_timesheet_day_rules ON timesheet_days;');
  pgm.sql('DROP FUNCTION IF EXISTS trg_timesheet_day_rules();');
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_balance;');
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_expected;');
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_totals;');
  pgm.dropTable('timesheet_days');
  pgm.dropTable('timesheets');
}

