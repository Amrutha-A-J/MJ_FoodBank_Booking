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
  priority: number;
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
  priority?: number;
}

export async function createEvent({
  title,
  details = null,
  category = null,
  startDate,
  endDate,
  createdBy,
  visibleToVolunteers = false,
  visibleToClients = false,
  priority = 0,
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
        visible_to_clients,
        priority
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
      priority,
    ],
  );
  return res.rows[0];
}

export { createEvent as insertEvent };

export interface UpdateEventParams {
  title?: string;
  details?: string | null;
  category?: string | null;
  startDate?: string;
  endDate?: string;
  visibleToVolunteers?: boolean;
  visibleToClients?: boolean;
  priority?: number;
}

export async function updateEvent(
  id: number,
  data: UpdateEventParams,
): Promise<Event | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(data.title);
  }
  if (data.details !== undefined) {
    fields.push(`details = $${idx++}`);
    values.push(data.details);
  }
  if (data.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(data.category);
  }
  if (data.startDate !== undefined) {
    fields.push(`start_date = $${idx++}`);
    values.push(data.startDate);
  }
  if (data.endDate !== undefined) {
    fields.push(`end_date = $${idx++}`);
    values.push(data.endDate);
  }
  if (data.visibleToVolunteers !== undefined) {
    fields.push(`visible_to_volunteers = $${idx++}`);
    values.push(data.visibleToVolunteers);
  }
  if (data.visibleToClients !== undefined) {
    fields.push(`visible_to_clients = $${idx++}`);
    values.push(data.visibleToClients);
  }
  if (data.priority !== undefined) {
    fields.push(`priority = $${idx++}`);
    values.push(data.priority);
  }

  if (fields.length === 0) {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  const query = `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const res = await pool.query(query, [...values, id]);
  return res.rows[0] ?? null;
}

export async function listEvents(): Promise<Event[]> {
  const res = await pool.query(
    'SELECT * FROM events ORDER BY start_date',
  );
  return res.rows;
}
