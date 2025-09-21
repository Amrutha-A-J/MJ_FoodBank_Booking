import '../setupTests';
import {
  listMyTimesheets,
  listTimesheets,
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

  it('lists all timesheets for admin', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 1 }, { id: 2 }],
      rowCount: 2,
    });
    const req: any = { user: { id: '99', role: 'admin', type: 'staff' }, query: {} };
    const res: any = { json: jest.fn() };
    await listTimesheets(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  it('filters timesheets by staffId for admin', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 3 }], rowCount: 1 });
    const req: any = {
      user: { id: '99', role: 'admin', type: 'staff' },
      query: { staffId: '3' },
    };
    const res: any = { json: jest.fn() };
    await listTimesheets(req, res, () => {});
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE t.staff_id = $1'), [3]);
    expect(res.json).toHaveBeenCalledWith([{ id: 3 }]);
  });

  it('responds with 400 for invalid query parameters', async () => {
    (mockPool.query as jest.Mock).mockClear();
    const req: any = {
      user: { id: '99', role: 'admin', type: 'staff' },
      query: { staffId: 'abc' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await listTimesheets(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid query parameters' });
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('filters timesheets by overlapping month', async () => {
    (mockPool.query as jest.Mock).mockClear();
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 4 }], rowCount: 1 });
    const req: any = {
      user: { id: '99', role: 'admin', type: 'staff' },
      query: { month: '4', year: '2024' },
    };
    const res: any = { json: jest.fn() };
    await listTimesheets(req, res, () => {});
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toContain('t.start_date <= ($1');
    expect(call[0]).toContain('AND t.end_date >= $1');
    expect(call[1]).toEqual(['2024-04-01']);
    expect(res.json).toHaveBeenCalledWith([{ id: 4 }]);
  });

  it('gets timesheet days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            timesheet_id: 1,
            work_date: '2024-01-02',
            expected_hours: 3,
            reg_hours: 1,
            ot_hours: 0,
            stat_hours: 0,
            sick_hours: 0,
            vac_hours: 0,
            note: null,
            locked_by_rule: false,
            locked_by_leave: false,
          },
        ],
        rowCount: 1,
      });
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await getTimesheetDays(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 2,
        timesheet_id: 1,
        work_date: '2024-01-02',
        expected_hours: 3,
        reg_hours: 1,
        ot_hours: 0,
        stat_hours: 0,
        sick_hours: 0,
        vac_hours: 0,
        note: null,
        locked_by_rule: false,
        locked_by_leave: false,
      },
    ]);
  });

  it('prevents staff from viewing others timesheet days', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ staff_id: 2 }], rowCount: 1 });
    const req: any = { user: { id: '1', role: 'staff', type: 'staff' }, params: { id: '1' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getTimesheetDays(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { code: 'TIMESHEET_NOT_FOUND', message: 'Timesheet not found' },
      }),
    );
  });

  it('allows admin to view other staff timesheet days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 2 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            timesheet_id: 1,
            work_date: '2024-01-02',
            expected_hours: 3,
            reg_hours: 1,
            ot_hours: 0,
            stat_hours: 0,
            sick_hours: 0,
            vac_hours: 0,
            note: null,
            locked_by_rule: false,
            locked_by_leave: false,
          },
        ],
        rowCount: 1,
      });
    const req: any = { user: { id: '99', role: 'admin', type: 'staff' }, params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await getTimesheetDays(req, res, () => {});
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 3,
        timesheet_id: 1,
        work_date: '2024-01-02',
        expected_hours: 3,
        reg_hours: 1,
        ot_hours: 0,
        stat_hours: 0,
        sick_hours: 0,
        vac_hours: 0,
        note: null,
        locked_by_rule: false,
        locked_by_leave: false,
      },
    ]);
  });

  it('auto-fills stat holiday and locks editing', async () => {
    const lockErr: any = new Error('Cannot edit stat holiday');
    lockErr.code = 'STAT_DAY_LOCKED';
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            timesheet_id: 1,
            work_date: '2024-07-01',
            expected_hours: 8,
            reg_hours: 0,
            ot_hours: 0,
            stat_hours: 8,
            sick_hours: 0,
            vac_hours: 0,
            note: null,
            locked_by_rule: true,
            locked_by_leave: false,
          },
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
      {
        id: 1,
        timesheet_id: 1,
        work_date: '2024-07-01',
        expected_hours: 8,
        reg_hours: 0,
        ot_hours: 0,
        stat_hours: 8,
        sick_hours: 0,
        vac_hours: 0,
        note: null,
        locked_by_rule: true,
        locked_by_leave: false,
      },
    ]);

    const updReq: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
      params: { id: '1', date: '2024-07-01' },
      body: { regHours: 4 },
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
      body: { regHours: 3, otHours: 1, statHours: 0, sickHours: 0, vacHours: 0, note: 'hi' },
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
      body: { regHours: 2 },
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
      body: { regHours: 2 },
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
    capErr.code = 'DAILY_CAP_EXCEEDED';
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null, approved_at: null }], rowCount: 1 })
      .mockRejectedValueOnce(capErr);
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
      params: { id: '1', date: '2024-01-02' },
      body: { regHours: 10 },
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
