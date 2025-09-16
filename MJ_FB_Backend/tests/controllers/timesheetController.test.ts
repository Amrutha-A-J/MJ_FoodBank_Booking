import '../setupTests';
import errorHandler from '../../src/middleware/errorHandler';
import mockPool from '../utils/mockDb';
import {
  listMyTimesheets,
  listTimesheets,
  getTimesheetDays,
  updateTimesheetDay,
  submitTimesheet,
} from '../../src/controllers/timesheetController';
import * as timesheetModel from '../../src/models/timesheet';

jest.mock('../../src/models/timesheet', () => ({
  getTimesheetsForStaff: jest.fn(),
  getTimesheets: jest.fn(),
  getTimesheetDays: jest.fn(),
  getTimesheetById: jest.fn(),
  updateTimesheetDay: jest.fn(),
  submitTimesheet: jest.fn(),
  rejectTimesheet: jest.fn(),
  processTimesheet: jest.fn(),
}));

const mockedModel = timesheetModel as jest.Mocked<typeof import('../../src/models/timesheet')>;
const nextErr = (req: any, res: any) => (err: any) => errorHandler(err, req, res, () => {});

describe('timesheetController guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authorization', () => {
    it('rejects listing personal timesheets without a staff session', async () => {
      const req: any = { user: undefined };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await listMyTimesheets(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockedModel.getTimesheetsForStaff).not.toHaveBeenCalled();
    });

    it('rejects listing all timesheets when user is not staff', async () => {
      const req: any = { user: { id: '1', type: 'volunteer' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await listTimesheets(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockedModel.getTimesheets).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('returns 400 when parsing an invalid timesheet id', async () => {
      const req: any = {
        user: { id: '1', role: 'staff', type: 'staff' },
        params: { id: 'abc' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getTimesheetDays(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
      expect(mockedModel.getTimesheetById).not.toHaveBeenCalled();
    });

    it('returns 403 when a day is locked by approved leave', async () => {
      mockedModel.getTimesheetById.mockResolvedValue({ id: 1, staff_id: 1 } as any);
      mockedModel.updateTimesheetDay.mockRejectedValue({
        status: 403,
        code: 'LEAVE_DAY_LOCKED',
        message: 'Day locked by leave request',
      });

      const req: any = {
        user: { id: '1', role: 'staff', type: 'staff' },
        params: { id: '1', date: '2024-03-01' },
        body: { regHours: 1 },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateTimesheetDay(req, res, nextErr(req, res));

      expect(mockedModel.updateTimesheetDay).toHaveBeenCalledWith(1, '2024-03-01', {
        regHours: 1,
        otHours: 0,
        statHours: 0,
        sickHours: 0,
        vacHours: 0,
        note: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'LEAVE_DAY_LOCKED',
            message: 'Day locked by leave request',
          },
        }),
      );
    });

    it('bubbles stat holiday lock errors from the model', async () => {
      mockedModel.getTimesheetById.mockResolvedValue({ id: 1, staff_id: 1 } as any);
      mockedModel.updateTimesheetDay.mockRejectedValue({
        status: 400,
        code: 'STAT_DAY_LOCKED',
        message: 'Cannot edit stat holiday',
      });

      const req: any = {
        user: { id: '1', role: 'staff', type: 'staff' },
        params: { id: '1', date: '2024-07-01' },
        body: { regHours: 4 },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await updateTimesheetDay(req, res, nextErr(req, res));

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'STAT_DAY_LOCKED',
            message: 'Cannot edit stat holiday',
          },
        }),
      );
    });
  });

  describe('overtime shortfall handling', () => {
    it('returns validation errors from OT shortfalls', async () => {
      mockedModel.getTimesheetById.mockResolvedValue({ id: 1, staff_id: 1 } as any);
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Shortfall 2 exceeds OT 1'));

      const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await submitTimesheet(req, res, nextErr(req, res));

      expect(mockPool.query).toHaveBeenCalledWith('SELECT validate_timesheet_balance($1)', [1]);
      expect(mockedModel.submitTimesheet).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: { code: 'VALIDATION_ERROR', message: 'Shortfall 2 exceeds OT 1' },
        }),
      );
    });

    it('submits when OT covers the shortfall', async () => {
      mockedModel.getTimesheetById.mockResolvedValue({ id: 1, staff_id: 1 } as any);
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockedModel.submitTimesheet.mockResolvedValue();

      const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
      const res: any = { json: jest.fn() };

      await submitTimesheet(req, res, nextErr(req, res));

      expect(mockPool.query).toHaveBeenCalledWith('SELECT validate_timesheet_balance($1)', [1]);
      expect(mockedModel.submitTimesheet).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ message: 'Submitted' });
    });
  });
});
