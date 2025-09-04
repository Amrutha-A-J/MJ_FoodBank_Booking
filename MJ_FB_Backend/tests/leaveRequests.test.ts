import "./setupTests";
import {
  createLeaveRequest,
  approveLeaveRequest,
  listLeaveRequests,
} from "../src/controllers/leaveRequestController";
import mockPool from "./utils/mockDb";

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

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

  it("approves a leave request", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          staff_id: 1,
          start_date: "2024-01-02",
          end_date: "2024-01-03",
          status: "approved",
          reason: null,
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = { params: { id: "1" } };
    const res = makeRes();
    await approveLeaveRequest(req, res as any, () => {});
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      staff_id: 1,
      start_date: "2024-01-02",
      end_date: "2024-01-03",
      status: "approved",
      reason: null,
      created_at: "now",
      updated_at: "now",
    });
  });

  it("lists leave requests with staff name", async () => {
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
          staff_name: "Jane Doe",
        },
      ],
      rowCount: 1,
    });
    const req: any = {};
    const res = makeRes();
    await listLeaveRequests(req, res as any, () => {});
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        staff_id: 1,
        start_date: "2024-01-02",
        end_date: "2024-01-03",
        status: "pending",
        reason: null,
        created_at: "now",
        updated_at: "now",
        staff_name: "Jane Doe",
      },
    ]);
  });
});
