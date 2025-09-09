import pool from '../db';

export async function savePushToken(userId: number, role: string, token: string) {
  await pool.query(
    `INSERT INTO push_tokens (user_id, role, token)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, role = EXCLUDED.role`,
    [userId, role, token],
  );
}

export async function getTokensForUser(userId: number, role: string): Promise<string[]> {
  const res = await pool.query(
    'SELECT token FROM push_tokens WHERE user_id = $1 AND role = $2',
    [userId, role],
  );
  return res.rows.map((r) => r.token as string);
}
