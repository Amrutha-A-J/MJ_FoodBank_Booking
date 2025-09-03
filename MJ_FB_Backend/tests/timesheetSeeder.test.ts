import pool from '../src/db';
import logger from '../src/utils/logger';
import { seedTimesheets } from '../src/utils/timesheetSeeder';

describe('seedTimesheets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates timesheet and weekday rows for active staff', async () => {
    const calls: any[] = [];
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass('public.pay_periods')")) {
        return { rows: [{ table: 'pay_periods' }], rowCount: 1 };
      }
      if (sql.includes('FROM pay_periods')) {
        return { rows: [{ id: 1, start_date: '2024-06-01', end_date: '2024-06-15' }], rowCount: 1 };
      }
      if (sql.includes('FROM staff')) {
        return { rows: [{ id: 7, starts_on: '2024-05-20' }], rowCount: 1 };
      }
      if (sql.startsWith('SELECT id FROM timesheets')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('INSERT INTO timesheets')) {
        return { rows: [{ id: 99 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await seedTimesheets();

    const insertTs = calls.find((c) => c.sql.startsWith('INSERT INTO timesheets'));
    expect(insertTs).toBeDefined();
    const insertDays = calls.find((c) => c.sql.startsWith('INSERT INTO timesheet_days'));
    expect(insertDays).toBeDefined();
    expect(insertDays.sql).toContain('GREATEST($2::date, $3::date)');
    expect(insertDays.params).toEqual([99, '2024-06-01', '2024-05-20', '2024-06-15']);
  });

  it('uses staff start date when later than period start', async () => {
    const calls: any[] = [];
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass('public.pay_periods')")) {
        return { rows: [{ table: 'pay_periods' }], rowCount: 1 };
      }
      if (sql.includes('FROM pay_periods')) {
        return { rows: [{ id: 2, start_date: '2024-06-01', end_date: '2024-06-15' }], rowCount: 1 };
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

    const insertTs = calls.find((c) => c.sql.startsWith('INSERT INTO timesheets'));
    expect(insertTs).toBeUndefined();
    const insertDays = calls.find((c) => c.sql.startsWith('INSERT INTO timesheet_days'));
    expect(insertDays).toBeDefined();
    expect(insertDays.params).toEqual([50, '2024-06-01', '2024-06-05', '2024-06-15']);
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
});
