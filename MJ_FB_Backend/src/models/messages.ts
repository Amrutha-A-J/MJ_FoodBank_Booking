import pool from '../db';

export async function createMessage(
  volunteerId: number,
  senderRole: string,
  body: string,
) {
  const res = await pool.query(
    `INSERT INTO messages (volunteer_id, sender_role, body)
     VALUES ($1, $2, $3)
     RETURNING id, volunteer_id, sender_role, body, created_at`,
    [volunteerId, senderRole, body],
  );
  return res.rows[0];
}

export async function getMessagesForVolunteer(volunteerId: number) {
  const res = await pool.query(
    `SELECT id, volunteer_id, sender_role, body, created_at
       FROM messages
       WHERE volunteer_id = $1
       ORDER BY created_at`,
    [volunteerId],
  );
  return res.rows;
}
