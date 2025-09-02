import './setupTests';
import {
  createRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
} from '../src/controllers/leaveRequestController';
import mockPool from './utils/mockDb';
import errorHandler from '../src/middleware/errorHandler';

const nextErr = (req: any, res: any) => (err: any) => errorHandler(err, req, res, () => {});

describe('leave requests', () => {
  beforeEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it('creates request and queues email', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            staff_id: 1,
            start_date: '2024-01-01',
            end_date: '2024-01-02',
            reason: null,
            status: 'pending',
            created_at: 'now',
            decided_at: null,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ value: 'hr@example.com' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = {
      user: { id: '1', role: 'staff', type: 'staff' },
      body: { startDate: '2024-01-01', endDate: '2024-01-02' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await createRequest(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(201);
    expect((mockPool.query as jest.Mock).mock.calls[2][0]).toContain('INSERT INTO email_outbox');
  });

  it('approves request and locks days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1, staff_id: 1, start_date: '2024-01-01', end_date: '2024-01-01', status: 'pending' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await approveRequest(req, res, nextErr(req, res));
    expect((mockPool.query as jest.Mock).mock.calls[2][0]).toContain('UPDATE timesheet_days');
  });

  it('rejects request', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await rejectRequest(req, res, nextErr(req, res));
    expect(res.json).toHaveBeenCalled();
  });

  it('cancels approved request and unlocks days', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1, staff_id: 1, start_date: '2024-01-01', end_date: '2024-01-01', status: 'approved' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const req: any = { params: { id: '1' } };
    const res: any = { json: jest.fn() };
    await cancelRequest(req, res, nextErr(req, res));
    expect((mockPool.query as jest.Mock).mock.calls[2][0]).toContain('UPDATE timesheet_days');
  });
});
