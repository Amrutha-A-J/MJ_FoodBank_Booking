import "./setupTests";
jest.mock("../src/models/timesheet", () => ({
  insertLeaveTimesheetDay: jest.fn().mockResolvedValue(undefined),
}));
import { insertLeaveTimesheetDay } from "../src/models/timesheet";
import {
  createLeaveRequest,
  approveLeaveRequest,
} from "../src/controllers/leaveRequestController";
import mockPool from "./utils/mockDb";

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("leave requests controller", () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (insertLeaveTimesheetDay as jest.Mock).mockReset();
  });

  it("creates a leave request", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          staff_id: 1,
          start_date: "2024-01-02",
          end_date: "2024-01-03",
          type: "vacation",
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
      body: { startDate: "2024-01-02", endDate: "2024-01-03", type: "vacation" },
    };
    const res = makeRes();
    await createLeaveRequest(req, res as any, () => {});
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      staff_id: 1,
      start_date: "2024-01-02",
      end_date: "2024-01-03",
      type: "vacation",
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
          type: "sick",
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
      type: "sick",
      status: "approved",
      reason: null,
      created_at: "now",
      updated_at: "now",
    });
    expect(insertLeaveTimesheetDay).toHaveBeenNthCalledWith(1, 1, "2024-01-02", "sick");
    expect(insertLeaveTimesheetDay).toHaveBeenNthCalledWith(2, 1, "2024-01-03", "sick");
  });
});
