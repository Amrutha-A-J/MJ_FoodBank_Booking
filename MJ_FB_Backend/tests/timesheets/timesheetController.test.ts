import '../setupTests';
import {
  listMyTimesheets,
  getTimesheetDays,
  updateTimesheetDay,
  submitTimesheet,
  rejectTimesheet,
  processTimesheet,
} from '../../src/controllers/timesheetController';
import errorHandler from '../../src/middleware/errorHandler';
import mockPool from '../utils/mockDb';

const nextErr = (req: any, res: any) => (err: any) => errorHandler(err, req, res, () => {});

describe('timesheet controller', () => {
  it('lists volunteer timesheets', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { user: { id: '1', role: 'volunteer' } };
    const res: any = { json: jest.fn() };
    await listMyTimesheets(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('gets timesheet days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ volunteer_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { id: 2, timesheet_id: 1, work_date: '2024-01-02', expected_hours: 3, actual_hours: 1 },
        ],
        rowCount: 1,
      });
    const req: any = { user: { id: '1', role: 'volunteer' }, params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await getTimesheetDays(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([
      { id: 2, timesheet_id: 1, work_date: '2024-01-02', expected_hours: 3, actual_hours: 1 },
    ]);
  });

  it('updates a timesheet day', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ volunteer_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null, approved_at: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'volunteer' },
      params: { id: '1', date: '2024-01-02' },
      body: { hours: 3 },
    };
    const res: any = { json: jest.fn() };
    await updateTimesheetDay(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith({ message: 'Updated' });
    expect((mockPool.query as jest.Mock).mock.calls[2][0]).toContain('UPDATE timesheet_days');
  });

  it('prevents editing a submitted timesheet', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ volunteer_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: '2024-01-10', approved_at: null }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'volunteer' },
      params: { id: '1', date: '2024-01-02' },
      body: { hours: 2 },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await updateTimesheetDay(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'TIMESHEET_LOCKED', message: 'Timesheet is locked' } }),
    );
  });

  it('rejects unbalanced timesheet on submit', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ volunteer_id: 1 }], rowCount: 1 })
      .mockRejectedValueOnce(new Error('Timesheet unbalanced'));
    const req: any = { user: { id: '1', role: 'volunteer' }, params: { id: '1' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await submitTimesheet(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'TIMESHEET_UNBALANCED', message: 'Timesheet must balance' } }),
    );
  });

  it('rejects and processes timesheet', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req1: any = { params: { id: '1' } };
    const res1: any = { json: jest.fn() };
    await rejectTimesheet(req1, res1, () => {});
    expect(res1.json).toHaveBeenCalledWith({ message: 'Rejected' });

    const req2: any = { params: { id: '1' } };
    const res2: any = { json: jest.fn() };
    await processTimesheet(req2, res2, () => {});
    expect(res2.json).toHaveBeenCalledWith({ message: 'Processed' });
  });
});
