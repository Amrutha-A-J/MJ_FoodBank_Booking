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
}

export async function insertLeaveRequest(
  staffId: number,
  startDate: string,
  endDate: string,
  reason?: string,
): Promise<LeaveRequest> {
  if (reason === "personal") {
    const countRes = await pool.query(
      `SELECT COUNT(*)
         FROM leave_requests
        WHERE staff_id = $1
          AND status = 'approved'
          AND reason = 'personal'
          AND start_date >= date_trunc('quarter', $2::date)
          AND start_date < date_trunc('quarter', $2::date) + interval '3 months'`,
      [staffId, startDate],
    );
    if (Number(countRes.rows[0].count) >= 1) {
      const err: any = new Error(
        "Personal day already taken this quarter",
      );
      err.status = 400;
      err.code = "PERSONAL_DAY_LIMIT";
      throw err;
    }
  }
  const res = await pool.query(
    `INSERT INTO leave_requests (staff_id, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [staffId, startDate, endDate, reason ?? null],
  );
  return res.rows[0];
}

export async function selectLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await pool.query(
    `SELECT * FROM leave_requests ORDER BY start_date`,
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
