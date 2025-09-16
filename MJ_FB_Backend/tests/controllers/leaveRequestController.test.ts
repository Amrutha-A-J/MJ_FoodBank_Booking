import "../setupTests";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

import leaveRequestsRoutes from "../../src/routes/leaveRequests";
import mockPool from "../utils/mockDb";
import {
  insertLeaveRequest,
  updateLeaveRequestStatus,
  countApprovedPersonalDaysThisQuarter,
  findLeaveRequestOverlaps,
  LeaveType,
} from "../../src/models/leaveRequest";
import { ensureTimesheetDay } from "../../src/models/timesheet";
import { insertEvent } from "../../src/models/event";

jest.mock("jsonwebtoken");
jest.mock("../../src/models/leaveRequest", () => {
  const actual = jest.requireActual("../../src/models/leaveRequest");
  return {
    ...actual,
    insertLeaveRequest: jest.fn(),
    updateLeaveRequestStatus: jest.fn(),
    countApprovedPersonalDaysThisQuarter: jest.fn(),
    findLeaveRequestOverlaps: jest.fn(),
  };
});
jest.mock("../../src/models/timesheet", () => ({
  ensureTimesheetDay: jest.fn(),
}));
jest.mock("../../src/models/event", () => ({
  insertEvent: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api/v1/leave/requests", leaveRequestsRoutes);

const mockedJwtVerify = jwt.verify as jest.Mock;
const mockedQuery = mockPool.query as jest.Mock;
const mockedInsertLeaveRequest =
  insertLeaveRequest as jest.MockedFunction<typeof insertLeaveRequest>;
const mockedUpdateLeaveRequestStatus =
  updateLeaveRequestStatus as jest.MockedFunction<typeof updateLeaveRequestStatus>;
const mockedCountPersonalDays =
  countApprovedPersonalDaysThisQuarter as jest.MockedFunction<
    typeof countApprovedPersonalDaysThisQuarter
  >;
const mockedFindLeaveRequestOverlaps =
  findLeaveRequestOverlaps as jest.MockedFunction<typeof findLeaveRequestOverlaps>;
const mockedEnsureTimesheetDay =
  ensureTimesheetDay as jest.MockedFunction<typeof ensureTimesheetDay>;
const mockedInsertEvent = insertEvent as jest.MockedFunction<typeof insertEvent>;

const baseLeaveRequest = {
  id: 42,
  staff_id: 7,
  start_date: "2024-06-10",
  end_date: "2024-06-11",
  type: LeaveType.Vacation,
  status: "pending",
  reason: null,
  requester_name: "Test Staff",
  created_at: "now",
  updated_at: "now",
};

const mockStaffAuth = (role: "staff" | "admin" = "staff") => {
  mockedJwtVerify.mockReturnValue({ id: 7, role, type: "staff" });
  mockedQuery.mockResolvedValueOnce({
    rowCount: 1,
    rows: [
      {
        id: 7,
        first_name: "Test",
        last_name: "Staff",
        email: "staff@example.com",
        role,
      },
    ],
  });
};

const mockVolunteerAuth = () => {
  mockedJwtVerify.mockReturnValue({ id: 99, role: "volunteer", type: "volunteer" });
  mockedQuery.mockResolvedValueOnce({
    rowCount: 1,
    rows: [
      {
        id: 99,
        first_name: "Vol",
        last_name: "unteer",
        email: "vol@example.com",
      },
    ],
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedCountPersonalDays.mockResolvedValue(0);
  mockedFindLeaveRequestOverlaps.mockResolvedValue([]);
  mockedInsertLeaveRequest.mockResolvedValue({ ...baseLeaveRequest });
  mockedUpdateLeaveRequestStatus.mockResolvedValue({
    ...baseLeaveRequest,
    status: "approved",
  });
  mockedEnsureTimesheetDay.mockResolvedValue(undefined);
  mockedInsertEvent.mockResolvedValue({} as any);
});

describe("leaveRequestController routes", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/leave/requests")
      .send({
        startDate: "2024-06-10",
        endDate: "2024-06-11",
        type: LeaveType.Vacation,
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Missing token" });
  });

  it("returns 403 when a volunteer attempts to create a leave request", async () => {
    mockVolunteerAuth();

    const res = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", "Bearer token")
      .send({
        startDate: "2024-06-10",
        endDate: "2024-06-11",
        type: LeaveType.Vacation,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Forbidden" });
    expect(mockedInsertLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads with schema errors", async () => {
    mockStaffAuth();

    const res = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", "Bearer token")
      .send({
        startDate: "2024-06-11",
        endDate: "2024-06-10",
        type: LeaveType.Vacation,
      });

    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toBe(
      "endDate must be on or after startDate",
    );
    expect(mockedInsertLeaveRequest).not.toHaveBeenCalled();
  });

  it("returns an overlap error when dates conflict", async () => {
    mockStaffAuth();
    mockedFindLeaveRequestOverlaps.mockResolvedValueOnce([
      {
        id: 55,
        start_date: "2024-06-10",
        end_date: "2024-06-12",
        status: "pending",
        type: LeaveType.Vacation,
      },
    ]);

    const res = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", "Bearer token")
      .send({
        startDate: "2024-06-11",
        endDate: "2024-06-12",
        type: LeaveType.Vacation,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "Leave request overlaps an existing request",
      overlap: [
        {
          id: 55,
          start_date: "2024-06-10",
          end_date: "2024-06-12",
          status: "pending",
          type: LeaveType.Vacation,
        },
      ],
    });
    expect(mockedInsertLeaveRequest).not.toHaveBeenCalled();
  });

  it("allows admins to approve leave requests", async () => {
    mockStaffAuth("admin");
    mockedUpdateLeaveRequestStatus.mockResolvedValueOnce({
      ...baseLeaveRequest,
      status: "approved",
    });

    const res = await request(app)
      .post("/api/v1/leave/requests/9/approve")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(mockedUpdateLeaveRequestStatus).toHaveBeenCalledWith(9, "approved");
    expect(mockedEnsureTimesheetDay).toHaveBeenCalledTimes(2);
    expect(mockedEnsureTimesheetDay).toHaveBeenNthCalledWith(1, 7, "2024-06-10");
    expect(mockedEnsureTimesheetDay).toHaveBeenNthCalledWith(2, 7, "2024-06-11");
    expect(mockedInsertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "staff_leave",
        startDate: "2024-06-10",
        endDate: "2024-06-11",
        createdBy: 7,
      }),
    );
    expect(res.body).toMatchObject({ status: "approved" });
  });

  it("prevents staff from approving leave requests", async () => {
    mockStaffAuth("staff");

    const res = await request(app)
      .post("/api/v1/leave/requests/9/approve")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Forbidden" });
    expect(mockedUpdateLeaveRequestStatus).not.toHaveBeenCalled();
  });

  it("allows admins to reject leave requests", async () => {
    mockStaffAuth("admin");
    mockedUpdateLeaveRequestStatus.mockResolvedValueOnce({
      ...baseLeaveRequest,
      status: "rejected",
    });

    const res = await request(app)
      .post("/api/v1/leave/requests/9/reject")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
    expect(mockedEnsureTimesheetDay).not.toHaveBeenCalled();
  });

  it("returns 404 when attempting to update a missing leave request", async () => {
    mockStaffAuth("admin");
    mockedUpdateLeaveRequestStatus.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/v1/leave/requests/123/approve")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Leave request not found" });
    expect(mockedEnsureTimesheetDay).not.toHaveBeenCalled();
    expect(mockedInsertEvent).not.toHaveBeenCalled();
  });
});

