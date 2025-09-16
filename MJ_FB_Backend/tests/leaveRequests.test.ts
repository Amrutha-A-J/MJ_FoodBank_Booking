import "./setupTests";
import {
  createLeaveRequest,
  approveLeaveRequest,
  listLeaveRequests,
  listLeaveRequestsByStaff,
} from "../src/controllers/leaveRequestController";
import mockPool from "./utils/mockDb";
import { ensureTimesheetDay } from "../src/models/timesheet";
import { insertEvent } from "../src/models/event";

jest.mock("../src/models/timesheet", () => ({
  ensureTimesheetDay: jest.fn(),
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
    (ensureTimesheetDay as jest.Mock).mockReset();
    (insertEvent as jest.Mock).mockReset();
  });

  it("rejects personal leave if already taken this quarter", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ count: 1 }],
      rowCount: 1,
    });
    const req: any = {
      user: { id: "1", role: "staff", type: "staff" },
      body: {
        startDate: "2024-02-02",
        endDate: "2024-02-02",
        type: "personal",
      },
    };
    const res = makeRes();
    await createLeaveRequest(req, res as any, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Only one personal day per quarter is allowed",
    });
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it("creates a leave request", async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
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
    expect(ensureTimesheetDay).toHaveBeenCalledTimes(2);
    expect(ensureTimesheetDay).toHaveBeenCalledWith(1, "2024-01-02");
    expect(ensureTimesheetDay).toHaveBeenCalledWith(1, "2024-01-03");
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

  it("approves a personal leave request without seeding timesheets", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          staff_id: 1,
          start_date: "2024-02-02",
          end_date: "2024-02-02",
          type: "personal",
          status: "approved",
          reason: null,
          requester_name: "Test User",
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = { params: { id: "2" } };
    const res = makeRes();
    await approveLeaveRequest(req, res as any, () => {});
    expect(res.json).toHaveBeenCalledWith({
      id: 2,
      staff_id: 1,
      start_date: "2024-02-02",
      end_date: "2024-02-02",
      type: "personal",
      status: "approved",
      reason: null,
      requester_name: "Test User",
      created_at: "now",
      updated_at: "now",
    });
    expect(ensureTimesheetDay).not.toHaveBeenCalled();
    expect(insertEvent).toHaveBeenCalled();
  });

  it("lists leave requests for a staff member", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          staff_id: 1,
          start_date: "2024-03-01",
          end_date: "2024-03-01",
          type: "sick",
          status: "pending",
          reason: null,
          requester_name: "Test User",
          created_at: "now",
          updated_at: "now",
        },
      ],
      rowCount: 1,
    });
    const req: any = { params: { staffId: "1" } };
    const res = makeRes();
    await listLeaveRequestsByStaff(req, res as any, () => {});
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 3,
        staff_id: 1,
        start_date: "2024-03-01",
        end_date: "2024-03-01",
        type: "sick",
        status: "pending",
        reason: null,
        requester_name: "Test User",
        created_at: "now",
        updated_at: "now",
      },
    ]);
    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [1]);
  });

  it("lists only pending leave requests", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 4,
          staff_id: 1,
          start_date: "2024-04-01",
          end_date: "2024-04-02",
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
    const req: any = {};
    const res = makeRes();
    await listLeaveRequests(req, res as any, () => {});
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE lr.status = 'pending'"),
    );
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 4,
        staff_id: 1,
        start_date: "2024-04-01",
        end_date: "2024-04-02",
        type: "vacation",
        status: "pending",
        reason: null,
        requester_name: "Test User",
        created_at: "now",
        updated_at: "now",
      },
    ]);
  });
});
