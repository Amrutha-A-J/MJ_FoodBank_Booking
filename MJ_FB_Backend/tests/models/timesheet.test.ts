import '../setupTests';
import mockPool from '../utils/mockDb';
import {
  getTimesheetDays,
  ensureTimesheetDay,
  updateTimesheetDay,
  submitTimesheet,
  rejectTimesheet,
  processTimesheet,
} from '../../src/models/timesheet';

describe('timesheet model', () => {
  beforeEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('getTimesheetDays', () => {
    it('returns stat holiday auto-fill, OT bank adjustments, and locked leave entries', async () => {
      const rows = [
        {
          id: 1,
          timesheet_id: 12,
          work_date: '2024-07-01',
          expected_hours: 8,
          reg_hours: 0,
          ot_hours: 0,
          stat_hours: 8,
          sick_hours: 0,
          vac_hours: 0,
          note: 'Canada Day',
          locked_by_rule: true,
          locked_by_leave: false,
        },
        {
          id: 2,
          timesheet_id: 12,
          work_date: '2024-07-02',
          expected_hours: 8,
          reg_hours: 6,
          ot_hours: -2,
          stat_hours: 0,
          sick_hours: 0,
          vac_hours: 0,
          note: 'OT bank adjustment',
          locked_by_rule: false,
          locked_by_leave: false,
        },
        {
          id: 3,
          timesheet_id: 12,
          work_date: '2024-07-03',
          expected_hours: 0,
          reg_hours: 0,
          ot_hours: 0,
          stat_hours: 0,
          sick_hours: 0,
          vac_hours: 8,
          note: 'Vacation day locked',
          locked_by_rule: false,
          locked_by_leave: true,
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows,
        rowCount: rows.length,
      });

      const result = await getTimesheetDays(12);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM timesheet_days'),
        [12],
      );
      expect(result).toEqual(rows);
    });
  });

  describe('ensureTimesheetDay', () => {
    it('returns early when no pay period is found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await ensureTimesheetDay(4, '2024-07-10');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('creates a new timesheet and inserts the day when missing', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ start_date: '2024-07-01', end_date: '2024-07-14' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 55 }], rowCount: 1 })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      await ensureTimesheetDay(7, '2024-07-03');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM pay_periods'),
        ['2024-07-03'],
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM timesheets'),
        [7, '2024-07-01', '2024-07-14'],
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO timesheets'),
        [7, '2024-07-01', '2024-07-14'],
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO timesheet_days'),
        [55, '2024-07-03'],
      );
    });
  });

  describe('updateTimesheetDay', () => {
    const basePayload = {
      regHours: 4,
      otHours: 0,
      statHours: 0,
      sickHours: 0,
      vacHours: 0,
    };

    it('throws when timesheet is missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateTimesheetDay(1, '2024-07-04', basePayload)).rejects.toMatchObject({
        status: 404,
        code: 'TIMESHEET_NOT_FOUND',
        message: 'Timesheet not found',
      });
    });

    it('throws when updating a locked stat holiday', async () => {
      const lockErr: any = new Error('Cannot edit stat holiday');
      lockErr.code = 'STAT_DAY_LOCKED';

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ submitted_at: null, approved_at: null }],
          rowCount: 1,
        })
        .mockRejectedValueOnce(lockErr);

      await expect(updateTimesheetDay(2, '2024-07-01', basePayload)).rejects.toEqual({
        status: 400,
        code: 'STAT_DAY_LOCKED',
        message: 'Cannot edit stat holiday',
      });
    });

    it('throws when day record is not found', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ submitted_at: null, approved_at: null }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(updateTimesheetDay(2, '2024-07-05', basePayload)).rejects.toMatchObject({
        status: 404,
        code: 'DAY_NOT_FOUND',
        message: 'Day not found',
      });
    });
  });

  describe('submitTimesheet', () => {
    it('throws when the timesheet has already been submitted or is missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(submitTimesheet(10)).rejects.toMatchObject({
        status: 400,
        code: 'ALREADY_SUBMITTED',
        message: 'Timesheet already submitted',
      });
    });
  });

  describe('rejectTimesheet', () => {
    it('throws when the timesheet cannot be reverted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(rejectTimesheet(11)).rejects.toMatchObject({
        status: 400,
        code: 'ALREADY_PROCESSED',
        message: 'Timesheet already processed',
      });
    });
  });

  describe('processTimesheet', () => {
    it('throws when the timesheet is not balanced', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Balance mismatch'));

      await expect(processTimesheet(12)).rejects.toMatchObject({
        status: 400,
        code: 'TIMESHEET_UNBALANCED',
        message: 'Timesheet must balance',
      });
    });

    it('throws when approval update affects no rows', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ result: null }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(processTimesheet(13)).rejects.toMatchObject({
        status: 400,
        code: 'NOT_SUBMITTED',
        message: 'Timesheet not submitted',
      });
    });
  });
});
