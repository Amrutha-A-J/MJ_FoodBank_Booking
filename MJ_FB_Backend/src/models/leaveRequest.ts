import pool from "../db";

export enum LeaveType {
  Vacation = "vacation",
  Sick = "sick",
  Personal = "personal",
}

export interface LeaveRequest {
  id: number;
  staff_id: number;
  start_date: string;
  end_date: string;
  type: LeaveType;
  status: string;
  reason?: string | null;
  requester_name: string;
  created_at: string;
  updated_at: string;
}

export type LeaveRequestOverlap = Pick<
  LeaveRequest,
  "id" | "start_date" | "end_date" | "status" | "type"
>;

export async function insertLeaveRequest(
  staffId: number,
  startDate: string,
  endDate: string,
  type: LeaveType,
  reason?: string,
): Promise<LeaveRequest> {
  const res = await pool.query(
    `WITH ins AS (
       INSERT INTO leave_requests (staff_id, start_date, end_date, type, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT ins.*, s.first_name || ' ' || s.last_name AS requester_name
     FROM ins
     JOIN staff s ON s.id = ins.staff_id`,
    [staffId, startDate, endDate, type, reason ?? null],
  );
  return res.rows[0];
}

export async function selectLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await pool.query(
    `SELECT lr.*, s.first_name || ' ' || s.last_name AS requester_name
     FROM leave_requests lr
     JOIN staff s ON s.id = lr.staff_id
     WHERE lr.status = 'pending'
     ORDER BY lr.start_date`,
  );
  return res.rows;
}

export async function selectLeaveRequestsByStaffId(
  staffId: number,
): Promise<LeaveRequest[]> {
  const res = await pool.query(
    `SELECT lr.*, s.first_name || ' ' || s.last_name AS requester_name
     FROM leave_requests lr
     JOIN staff s ON s.id = lr.staff_id
     WHERE lr.staff_id = $1
     ORDER BY lr.start_date`,
    [staffId],
  );
  return res.rows;
}

export async function updateLeaveRequestStatus(
  id: number,
  status: string,
): Promise<LeaveRequest | null> {
  const res = await pool.query(
    `WITH upd AS (
       UPDATE leave_requests lr
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *
     )
     SELECT upd.*, s.first_name || ' ' || s.last_name AS requester_name
     FROM upd
     JOIN staff s ON s.id = upd.staff_id`,
    [status, id],
  );
  return res.rows[0] ?? null;
}

export async function countApprovedPersonalDaysThisQuarter(
  staffId: number,
): Promise<number> {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM leave_requests
     WHERE staff_id = $1
       AND type = $2
       AND status = 'approved'
       AND start_date >= date_trunc('quarter', CURRENT_DATE)::date
       AND start_date < (date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months')::date`,
    [staffId, LeaveType.Personal],
  );
  return res.rows[0]?.count ?? 0;
}

export async function findLeaveRequestOverlaps(
  staffId: number,
  startDate: string,
  endDate: string,
): Promise<LeaveRequestOverlap[]> {
  const res = await pool.query<LeaveRequestOverlap>(
    `SELECT id, start_date, end_date, status, type
     FROM leave_requests
     WHERE staff_id = $1
       AND status != 'rejected'
       AND NOT ($3 < start_date OR $2 > end_date)
     ORDER BY start_date`,
    [staffId, startDate, endDate],
  );
  return res.rows;
}
