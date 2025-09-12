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

export interface UpdateEventParams {
  title?: string;
  details?: string | null;
  category?: string | null;
  startDate?: string;
  endDate?: string;
  visibleToVolunteers?: boolean;
  visibleToClients?: boolean;
}

export async function updateEvent(
  id: number,
  {
    title,
    details,
    category,
    startDate,
    endDate,
    visibleToVolunteers,
    visibleToClients,
  }: UpdateEventParams,
): Promise<Event | undefined> {
  const fields: string[] = [];
  const params: any[] = [id];
  let idx = 2;
  if (title !== undefined) {
    fields.push(`title = $${idx++}`);
    params.push(title);
  }
  if (details !== undefined) {
    fields.push(`details = $${idx++}`);
    params.push(details);
  }
  if (category !== undefined) {
    fields.push(`category = $${idx++}`);
    params.push(category);
  }
  if (startDate !== undefined) {
    fields.push(`start_date = $${idx++}`);
    params.push(startDate);
  }
  if (endDate !== undefined) {
    fields.push(`end_date = $${idx++}`);
    params.push(endDate);
  }
  if (visibleToVolunteers !== undefined) {
    fields.push(`visible_to_volunteers = $${idx++}`);
    params.push(visibleToVolunteers);
  }
  if (visibleToClients !== undefined) {
    fields.push(`visible_to_clients = $${idx++}`);
    params.push(visibleToClients);
  }
  if (fields.length === 0) {
    const res = await pool.query<Event>(
      'SELECT * FROM events WHERE id = $1',
      [id],
    );
    return res.rows[0];
  }
  const res = await pool.query<Event>(
    `UPDATE events SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return res.rows[0];
}
