import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('timesheet_days', {
    reg_hours: { type: 'integer', notNull: true, default: 0 },
    ot_hours: { type: 'integer', notNull: true, default: 0 },
    stat_hours: { type: 'integer', notNull: true, default: 0 },
    sick_hours: { type: 'integer', notNull: true, default: 0 },
    vac_hours: { type: 'integer', notNull: true, default: 0 },
    note: { type: 'text' },
    locked_by_rule: { type: 'boolean', notNull: true, default: false },
    locked_by_leave: { type: 'boolean', notNull: true, default: false },
  });

  pgm.dropColumn('timesheet_days', 'actual_hours');

  // Replace views
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_totals;');
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_expected;');
  pgm.sql('DROP VIEW IF EXISTS v_timesheet_balance;');

  pgm.sql(`
    CREATE VIEW v_timesheet_totals AS
      SELECT t.id AS timesheet_id,
             COALESCE(SUM(td.reg_hours + td.ot_hours + td.stat_hours + td.sick_hours + td.vac_hours), 0) AS total_hours
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
             COALESCE(SUM(td.ot_hours), 0) AS ot_hours,
             COALESCE(SUM(td.reg_hours + td.stat_hours + td.sick_hours + td.vac_hours - td.expected_hours), 0) AS balance_hours
        FROM timesheets t
        LEFT JOIN timesheet_days td ON td.timesheet_id = t.id
       GROUP BY t.id;
  `);

  // Replace trigger function
  pgm.sql('DROP TRIGGER IF EXISTS trg_timesheet_day_rules ON timesheet_days;');
  pgm.sql('DROP FUNCTION IF EXISTS trg_timesheet_day_rules();');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_timesheet_day_rules()
    RETURNS trigger AS $$
    DECLARE
      is_stat boolean;
    BEGIN
      IF TG_OP = 'UPDATE' AND (OLD.locked_by_rule OR OLD.locked_by_leave) THEN
        RAISE EXCEPTION 'Day is locked';
      END IF;

      SELECT EXISTS(SELECT 1 FROM holidays WHERE date = NEW.work_date) INTO is_stat;
      IF is_stat THEN
        NEW.stat_hours := NEW.expected_hours;
        NEW.reg_hours := 0;
        NEW.ot_hours := 0;
        NEW.sick_hours := 0;
        NEW.vac_hours := 0;
        NEW.note := NULL;
        NEW.locked_by_rule := TRUE;
      END IF;

      IF NEW.reg_hours + NEW.stat_hours + NEW.sick_hours + NEW.vac_hours > 8 THEN
        RAISE EXCEPTION 'Daily paid hours cannot exceed 8';
      END IF;

      IF NEW.reg_hours < 0 OR NEW.ot_hours < 0 OR NEW.stat_hours < 0 OR NEW.sick_hours < 0 OR NEW.vac_hours < 0 THEN
        RAISE EXCEPTION 'Hours cannot be negative';
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

  // Replace balance validation function
  pgm.sql('DROP FUNCTION IF EXISTS validate_timesheet_balance(integer);');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION validate_timesheet_balance(p_timesheet_id integer)
    RETURNS void AS $$
    DECLARE
      v_shortfall integer;
      v_ot integer;
    BEGIN
      SELECT COALESCE(SUM(td.reg_hours + td.stat_hours + td.sick_hours + td.vac_hours - td.expected_hours), 0),
             COALESCE(SUM(td.ot_hours), 0)
        INTO v_shortfall, v_ot
        FROM timesheet_days td
       WHERE td.timesheet_id = p_timesheet_id;

      IF v_shortfall < 0 AND v_ot + v_shortfall < 0 THEN
        RAISE EXCEPTION 'Shortfall % exceeds OT %', abs(v_shortfall), v_ot;
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

  pgm.addColumn('timesheet_days', { actual_hours: { type: 'integer', notNull: true, default: 0 } });
  pgm.dropColumns('timesheet_days', [
    'reg_hours',
    'ot_hours',
    'stat_hours',
    'sick_hours',
    'vac_hours',
    'note',
    'locked_by_rule',
    'locked_by_leave',
  ]);

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
