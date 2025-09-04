import pool from "../db";

export interface Event {
  id: number;
  title: string;
  details: string | null;
  category: string | null;
  start_date: string;
  end_date: string;
  created_by: number;
  visible_to_volunteers: boolean;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsertEventParams {
  title: string;
  details?: string | null;
  category?: string | null;
  startDate: string;
  endDate: string;
  createdBy: number;
  visibleToVolunteers?: boolean;
  visibleToClients?: boolean;
}

export async function insertEvent({
  title,
  details = null,
  category = null,
  startDate,
  endDate,
  createdBy,
  visibleToVolunteers = false,
  visibleToClients = false,
}: InsertEventParams): Promise<Event> {
  const res = await pool.query(
    `INSERT INTO events (
        title,
        details,
        category,
        start_date,
        end_date,
        created_by,
        visible_to_volunteers,
        visible_to_clients
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      title,
      details,
      category,
      startDate,
      endDate,
      createdBy,
      visibleToVolunteers,
      visibleToClients,
    ],
  );
  return res.rows[0];
}
