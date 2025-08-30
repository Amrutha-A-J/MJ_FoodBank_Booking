import pool from '../db';
import { Queryable } from './bookingRepository';

export async function insertNewClient(
  name: string,
  email: string | null,
  phone: string | null,
  client: Queryable = pool,
) {
  const res = await client.query(
    `INSERT INTO new_clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
    [name, email, phone],
  );
  return res.rows[0].id;
}

export async function fetchNewClients(client: Queryable = pool) {
  const res = await client.query(
    `SELECT id, name, email, phone, created_at FROM new_clients ORDER BY created_at DESC`,
  );
  return res.rows;
}

export async function deleteNewClient(id: number, client: Queryable = pool) {
  await client.query(`DELETE FROM new_clients WHERE id=$1`, [id]);
}
