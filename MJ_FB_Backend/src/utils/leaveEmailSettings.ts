import pool from '../db';

const KEY = 'leave_request_email';

let cache: string | null = null;

export async function getLeaveEmail(): Promise<string | null> {
  if (cache !== null) return cache;
  const res = await pool.query('SELECT value FROM app_config WHERE key=$1', [KEY]);
  cache = res.rows[0]?.value ?? null;
  return cache;
}

export async function setLeaveEmail(email: string): Promise<void> {
  await pool.query(
    'INSERT INTO app_config (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',
    [KEY, email],
  );
  cache = email;
}

export function clearLeaveEmailCache() {
  cache = null;
}
