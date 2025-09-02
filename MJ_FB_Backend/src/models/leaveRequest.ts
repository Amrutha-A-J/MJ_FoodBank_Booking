import pool from '../db';
import { enqueueEmail } from '../utils/emailOutbox';
import { getLeaveEmail } from '../utils/leaveEmailSettings';

export interface LeaveRequest {
  id: number;
  staff_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  decided_at: string | null;
}

export async function listLeaveRequests(staffId?: number): Promise<LeaveRequest[]> {
  const res = await pool.query(
    `SELECT id, staff_id, start_date, end_date, reason, status, created_at, decided_at
       FROM leave_requests
      ${staffId ? 'WHERE staff_id = $1' : ''}
      ORDER BY created_at DESC`,
    staffId ? [staffId] : [],
  );
  return res.rows;
}

export async function createLeaveRequest(
  staffId: number,
  start: string,
  end: string,
  reason?: string,
): Promise<LeaveRequest> {
  const res = await pool.query(
    `INSERT INTO leave_requests (staff_id, start_date, end_date, reason)
     VALUES ($1,$2,$3,$4) RETURNING id, staff_id, start_date, end_date, reason, status, created_at, decided_at`,
    [staffId, start, end, reason ?? null],
  );
  const req = res.rows[0];
  const email = await getLeaveEmail();
  if (email) {
    await enqueueEmail({
      recipient: email,
      subject: 'New leave request',
      body: JSON.stringify(req),
    });
  }
  return req;
}

async function updateStatus(id: number, status: string): Promise<LeaveRequest> {
  const res = await pool.query(
    `UPDATE leave_requests SET status=$2, decided_at = NOW() WHERE id=$1 RETURNING *`,
    [id, status],
  );
  return res.rows[0];
}

function* dateRange(start: Date, end: Date): Generator<Date> {
  const d = new Date(start);
  while (d <= end) {
    yield new Date(d);
    d.setDate(d.getDate() + 1);
  }
}

async function lockDays(staffId: number, start: string, end: string) {
  for (const d of dateRange(new Date(start), new Date(end))) {
    const dateStr = d.toISOString().slice(0, 10);
    await pool.query(
      `UPDATE timesheet_days td
          SET vac_hours = td.expected_hours, locked_by_leave = true
         FROM timesheets t
        WHERE t.id = td.timesheet_id AND t.staff_id = $1 AND td.work_date = $2`,
      [staffId, dateStr],
    );
  }
}

async function unlockDays(staffId: number, start: string, end: string) {
  for (const d of dateRange(new Date(start), new Date(end))) {
    const dateStr = d.toISOString().slice(0, 10);
    await pool.query(
      `UPDATE timesheet_days td
          SET vac_hours = 0, locked_by_leave = false
         FROM timesheets t
        WHERE t.id = td.timesheet_id AND t.staff_id = $1 AND td.work_date = $2`,
      [staffId, dateStr],
    );
  }
}

export async function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await pool.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
  const req = res.rows[0];
  const updated = await updateStatus(id, 'approved');
  await lockDays(req.staff_id, req.start_date, req.end_date);
  return updated;
}

export async function rejectLeaveRequest(id: number): Promise<LeaveRequest> {
  return updateStatus(id, 'rejected');
}

export async function cancelLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await pool.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
  const req = res.rows[0];
  const updated = await updateStatus(id, 'cancelled');
  if (req.status === 'approved') {
    await unlockDays(req.staff_id, req.start_date, req.end_date);
  }
  return updated;
}
