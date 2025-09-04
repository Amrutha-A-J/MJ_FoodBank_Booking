import pool from "../db";

export interface LeaveRequest {
  id: number;
  staff_id: number;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  staff_name?: string;
}

export async function insertLeaveRequest(
  staffId: number,
  startDate: string,
  endDate: string,
  reason?: string,
): Promise<LeaveRequest> {
  const res = await pool.query(
    `INSERT INTO leave_requests (staff_id, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [staffId, startDate, endDate, reason ?? null],
  );
  return res.rows[0];
}

export async function selectLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await pool.query(
    `SELECT lr.*, s.first_name || ' ' || s.last_name AS staff_name
     FROM leave_requests lr
     JOIN staff s ON lr.staff_id = s.id
     ORDER BY lr.start_date`,
  );
  return res.rows;
}

export async function updateLeaveRequestStatus(
  id: number,
  status: string,
): Promise<LeaveRequest> {
  const res = await pool.query(
    `UPDATE leave_requests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return res.rows[0];
}
