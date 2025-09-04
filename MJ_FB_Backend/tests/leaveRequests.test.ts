import "./setupTests";
import {
  createLeaveRequest,
  approveLeaveRequest,
} from "../src/controllers/leaveRequestController";
import mockPool from "./utils/mockDb";
import errorHandler from "../src/middleware/errorHandler";

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const nextErr = (req: any, res: any) => (err: any) =>
  errorHandler(err, req, res, () => {});

describe("leave requests controller", () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it("creates a leave request", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          staff_id: 1,
          start_date: "2024-01-02",
          end_date: "2024-01-03",
          status: "pending",
          reason: null,
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = {
      user: { id: "1", role: "staff", type: "staff" },
      body: { startDate: "2024-01-02", endDate: "2024-01-03" },
    };
    const res = makeRes();
    await createLeaveRequest(req, res as any, () => {});
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      staff_id: 1,
      start_date: "2024-01-02",
      end_date: "2024-01-03",
      status: "pending",
      reason: null,
      created_at: "now",
      updated_at: "now",
    });
  });

  it("rejects personal leave when already taken this quarter", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: "1" }] });
    const req: any = {
      user: { id: "1", role: "staff", type: "staff" },
      body: { startDate: "2024-02-01", endDate: "2024-02-01", reason: "personal" },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await createLeaveRequest(req, res, nextErr(req, res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: "PERSONAL_DAY_LIMIT",
          message: "Personal day already taken this quarter",
        },
      }),
    );
  });

  it("approves a leave request and pre-fills timesheet", async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            staff_id: 1,
            start_date: "2024-01-02",
            end_date: "2024-01-03",
            status: "approved",
            reason: "vacation",
            created_at: "now",
            updated_at: "now",
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req: any = { params: { id: "1" } };
    const res = makeRes();
    await approveLeaveRequest(req, res as any, () => {});
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      staff_id: 1,
      start_date: "2024-01-02",
      end_date: "2024-01-03",
      status: "approved",
      reason: "vacation",
      created_at: "now",
      updated_at: "now",
    });
    expect((mockPool.query as jest.Mock).mock.calls[1][0]).toContain(
      "UPDATE timesheet_days",
    );
  });

  it("skips timesheet prefill for personal leave", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          staff_id: 1,
          start_date: "2024-02-01",
          end_date: "2024-02-01",
          status: "approved",
          reason: "personal",
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = { params: { id: "2" } };
    const res = makeRes();
    await approveLeaveRequest(req, res as any, () => {});
    expect((mockPool.query as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      id: 2,
      staff_id: 1,
      start_date: "2024-02-01",
      end_date: "2024-02-01",
      status: "approved",
      reason: "personal",
      created_at: "now",
      updated_at: "now",
    });
  });
});
