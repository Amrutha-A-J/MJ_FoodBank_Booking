import pool from '../db';

export async function upsertPushToken(userId: number, role: string, token: string): Promise<void> {
  await pool.query(
    `INSERT INTO push_tokens (user_id, user_role, token)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, user_role = EXCLUDED.user_role`,
    [userId, role, token],
  );
}

export async function getPushTokens(userId: number, role: string): Promise<string[]> {
  const res = await pool.query(
    'SELECT token FROM push_tokens WHERE user_id = $1 AND user_role = $2',
    [userId, role],
  );
  return res.rows.map(r => r.token as string);
}
