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
  it('lists staff timesheets', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' } };
    const res: any = { json: jest.fn() };
    await listMyTimesheets(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('gets timesheet days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { id: 2, timesheet_id: 1, work_date: '2024-01-02', expected_hours: 3, actual_hours: 1 },
        ],
        rowCount: 1,
      });
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await getTimesheetDays(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([
      { id: 2, timesheet_id: 1, work_date: '2024-01-02', expected_hours: 3, actual_hours: 1 },
    ]);
  });

  it('auto-fills stat holiday and locks editing', async () => {
    const lockErr: any = new Error('Cannot edit stat holiday');
    lockErr.status = 400;
    lockErr.code = 'STAT_DAY_LOCKED';
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, timesheet_id: 1, work_date: '2024-07-01', expected_hours: 8, actual_hours: 8 },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null, approved_at: null }], rowCount: 1 })
      .mockRejectedValueOnce(lockErr);

    const getReq: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const getRes: any = { json: jest.fn() };
    await getTimesheetDays(getReq, getRes, () => {});
    expect(getRes.json).toHaveBeenCalledWith([
      { id: 1, timesheet_id: 1, work_date: '2024-07-01', expected_hours: 8, actual_hours: 8 },
    ]);

    const updReq: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
      params: { id: '1', date: '2024-07-01' },
      body: { hours: 4 },
    };
    const updRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await updateTimesheetDay(updReq, updRes, nextErr(updReq, updRes));
    expect(updRes.status).toHaveBeenCalledWith(400);
    expect(updRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'STAT_DAY_LOCKED', message: 'Cannot edit stat holiday' } }),
    );
  });

  it('updates a timesheet day', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null, approved_at: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
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
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: '2024-01-10', approved_at: null }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
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

  it('prevents editing a processed timesheet', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: '2024-01-10', approved_at: '2024-01-11' }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
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

  it('returns validation error when shortfall exceeds OT', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockRejectedValueOnce(new Error('Shortfall 2 exceeds OT 1'));
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await submitTimesheet(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'VALIDATION_ERROR', message: 'Shortfall 2 exceeds OT 1' } }),
    );
  });

  it('enforces daily paid hour cap', async () => {
    const capErr: any = new Error('Daily paid hours cannot exceed 8');
    capErr.status = 400;
    capErr.code = 'DAILY_CAP_EXCEEDED';
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null, approved_at: null }], rowCount: 1 })
      .mockRejectedValueOnce(capErr);
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
      params: { id: '1', date: '2024-01-02' },
      body: { hours: 10 },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await updateTimesheetDay(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'DAILY_CAP_EXCEEDED', message: 'Daily paid hours cannot exceed 8' } }),
    );
  });

  it('submits timesheet when shortfall is covered by OT', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ result: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await submitTimesheet(req, res, nextErr(req, res));
    expect(res.json).toHaveBeenCalledWith({ message: 'Submitted' });
    expect((mockPool.query as jest.Mock).mock.calls[1][0]).toContain('validate_timesheet_balance');
    expect((mockPool.query as jest.Mock).mock.calls[2][0]).toContain('UPDATE timesheets');
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
