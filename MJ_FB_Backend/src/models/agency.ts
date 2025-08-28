import pool from '../db';

export interface Agency {
  id: number;
  name: string;
  email: string;
  password: string;
  contact_info: string | null;
}

export async function getAgencyByEmail(email: string): Promise<Agency | undefined> {
  const res = await pool.query('SELECT * FROM agencies WHERE email = $1', [email]);
  return res.rows[0] as Agency | undefined;
}

export interface AgencyClientSummary {
  client_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
}

export async function getAgencyClients(
  agencyId: number,
): Promise<AgencyClientSummary[]> {
  const res = await pool.query(
    `SELECT c.client_id, c.first_name, c.last_name, c.email
     FROM agency_clients ac
     INNER JOIN clients c ON c.client_id = ac.client_id
     WHERE ac.agency_id = $1`,
    [agencyId],
  );
  return res.rows as AgencyClientSummary[];
}

export async function isAgencyClient(
  agencyId: number,
  clientId: number,
): Promise<boolean> {
  const res = await pool.query(
    'SELECT 1 FROM agency_clients WHERE agency_id=$1 AND client_id=$2',
    [agencyId, clientId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function addAgencyClient(
  agencyId: number,
  clientId: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO agency_clients (agency_id, client_id) VALUES ($1,$2)
     ON CONFLICT (agency_id, client_id) DO NOTHING`,
    [agencyId, clientId],
  );
}

export async function removeAgencyClient(
  agencyId: number,
  clientId: number,
): Promise<void> {
  await pool.query(
    'DELETE FROM agency_clients WHERE agency_id=$1 AND client_id=$2',
    [agencyId, clientId],
  );
}

export default Agency;
