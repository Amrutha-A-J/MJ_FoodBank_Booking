import pool from './utils/mockDb';
import logger from '../src/utils/logger';
import { seedTimesheets } from '../src/utils/timesheetSeeder';

describe('seedTimesheets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockReset();
    (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('creates timesheet rows when staff start and active columns are not tracked', async () => {
    const calls: any[] = [];
    let tsId = 100;
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass('public.pay_periods')")) {
        return { rows: [{ table: 'pay_periods' }], rowCount: 1 };
      }
      if (sql.includes("FROM information_schema.columns")) {
        return { rows: [], rowCount: 0 }; // no starts_on or active columns
      }
      if (sql.includes('CURRENT_DATE BETWEEN')) {
        return { rows: [{ id: 1, start_date: '2024-06-01', end_date: '2024-06-15' }], rowCount: 1 };
      }
      if (sql.includes('start_date >= $1')) {
        return {
          rows: [
            { id: 1, start_date: '2024-06-01', end_date: '2024-06-15' },
            { id: 2, start_date: '2024-06-16', end_date: '2024-06-30' },
            { id: 3, start_date: '2024-07-01', end_date: '2024-07-15' },
            { id: 4, start_date: '2024-07-16', end_date: '2024-07-30' },
            { id: 5, start_date: '2024-07-31', end_date: '2024-08-14' },
          ],
          rowCount: 5,
        };
      }
      if (sql.includes('FROM staff')) {
        return { rows: [{ id: 7 }], rowCount: 1 };
      }
      if (sql.startsWith('SELECT id FROM timesheets')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('INSERT INTO timesheets')) {
        return { rows: [{ id: tsId++ }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await seedTimesheets();

    const staffCall = calls.find((c) => c.sql.includes('FROM staff'));
    expect(staffCall.sql).not.toMatch(/active/);
    const insertTs = calls.filter((c) => c.sql.startsWith('INSERT INTO timesheets'));
    expect(insertTs).toHaveLength(5);
    const insertDays = calls.filter((c) => c.sql.startsWith('INSERT INTO timesheet_days'));
    expect(insertDays).toHaveLength(5);
    expect(insertDays[0].sql).not.toContain('GREATEST');
    expect(insertDays[0].params?.slice(1)).toEqual(['2024-06-01', '2024-06-15']);
  });

  it('uses staff start date and filters active staff when columns are present', async () => {
    const calls: any[] = [];
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass('public.pay_periods')")) {
        return { rows: [{ table: 'pay_periods' }], rowCount: 1 };
      }
      if (sql.includes("FROM information_schema.columns")) {
        return { rows: [{ column_name: 'starts_on' }, { column_name: 'active' }], rowCount: 2 };
      }
      if (sql.includes('CURRENT_DATE BETWEEN')) {
        return { rows: [{ id: 2, start_date: '2024-06-01', end_date: '2024-06-15' }], rowCount: 1 };
      }
      if (sql.includes('start_date >= $1')) {
        return {
          rows: [
            { id: 2, start_date: '2024-06-01', end_date: '2024-06-15' },
            { id: 3, start_date: '2024-06-16', end_date: '2024-06-30' },
            { id: 4, start_date: '2024-07-01', end_date: '2024-07-15' },
            { id: 5, start_date: '2024-07-16', end_date: '2024-07-30' },
            { id: 6, start_date: '2024-07-31', end_date: '2024-08-14' },
          ],
          rowCount: 5,
        };
      }
      if (sql.includes('FROM staff')) {
        return { rows: [{ id: 5, starts_on: '2024-06-05' }], rowCount: 1 };
      }
      if (sql.startsWith('SELECT id FROM timesheets')) {
        return { rows: [{ id: 50 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await seedTimesheets();

    const staffCall = calls.find((c) => c.sql.includes('FROM staff'));
    expect(staffCall.sql).toMatch(/WHERE active = true/);
    const insertTs = calls.filter((c) => c.sql.startsWith('INSERT INTO timesheets'));
    expect(insertTs).toHaveLength(0);
    const insertDays = calls.filter((c) => c.sql.startsWith('INSERT INTO timesheet_days'));
    expect(insertDays).toHaveLength(5);
    expect(insertDays[0].sql).toContain('GREATEST($2::date, $3::date)');
    expect(insertDays[0].params).toEqual([50, '2024-06-01', '2024-06-05', '2024-06-15']);
  });

  it('skips seeding when pay_periods table is missing', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation();
    (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes("to_regclass('public.pay_periods')")) {
        return { rows: [{ table: null }], rowCount: 1 };
      }
      throw new Error('should not query other tables');
    });

    await seedTimesheets();

    expect(warn).toHaveBeenCalledWith('Skipping timesheet seeding: pay_periods table not found');
    warn.mockRestore();
    expect((pool.query as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('logs and swallows errors from database queries', async () => {
    const err = new Error('boom');
    (pool.query as jest.Mock).mockRejectedValue(err);
    const spy = jest.spyOn(logger, 'error').mockImplementation();

    await seedTimesheets();

    expect(spy).toHaveBeenCalledWith('Error seeding timesheets:', err);
    spy.mockRestore();
  });
});
