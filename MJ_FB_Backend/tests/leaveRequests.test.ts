import "./setupTests";
import {
  createLeaveRequest,
  approveLeaveRequest,
} from "../src/controllers/leaveRequestController";
import mockPool from "./utils/mockDb";
import seedTimesheets from "../src/utils/timesheetSeeder";
import { insertEvent } from "../src/models/event";

jest.mock("../src/utils/timesheetSeeder", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../src/models/event", () => ({
  insertEvent: jest.fn(),
}));

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("leave requests controller", () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (seedTimesheets as jest.Mock).mockReset();
    (insertEvent as jest.Mock).mockReset();
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
          requester_name: "Test User",
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = {
      user: { id: "1", role: "staff", type: "staff" },
      body: {
        startDate: "2024-01-02",
        endDate: "2024-01-03",
        type: "vacation",
      },
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
      requester_name: "Test User",
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
          type: "vacation",
          status: "approved",
          reason: null,
          requester_name: "Test User",
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
      type: "vacation",
      status: "approved",
      reason: null,
      requester_name: "Test User",
      created_at: "now",
      updated_at: "now",
    });
    expect(seedTimesheets).toHaveBeenCalledWith(1);
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "staff_leave",
        startDate: "2024-01-02",
        endDate: "2024-01-03",
        createdBy: 1,
        visibleToClients: true,
        visibleToVolunteers: true,
      }),
    );
  });
});
