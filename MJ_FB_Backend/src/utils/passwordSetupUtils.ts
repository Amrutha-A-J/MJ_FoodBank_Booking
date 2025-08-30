import { randomBytes, createHash } from 'crypto';
import pool from '../db';

export type PasswordTokenRow = {
  id: number;
  user_type: 'clients' | 'volunteers' | 'staff' | 'agencies';
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used: boolean;
};

const TOKEN_EXPIRY_MS =
  Number(process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS ?? '24') *
  60 * 60 * 1000; // default 24 hours

export async function generatePasswordSetupToken(
  userType: PasswordTokenRow['user_type'],
  userId: number,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
  await pool.query(
    `INSERT INTO password_setup_tokens (user_type, user_id, token_hash, expires_at, used)
     VALUES ($1,$2,$3,$4,false)`,
    [userType, userId, tokenHash, expiresAt],
  );
  return token;
}

export async function verifyPasswordSetupToken(
  token: string,
): Promise<PasswordTokenRow | null> {
  const hash = createHash('sha256').update(token).digest('hex');
  const res = await pool.query(
    `SELECT id, user_type, user_id, token_hash, expires_at, used
       FROM password_setup_tokens WHERE token_hash=$1`,
    [hash],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0] as PasswordTokenRow;
  if (row.used) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

export async function markPasswordTokenUsed(id: number): Promise<void> {
  await pool.query('UPDATE password_setup_tokens SET used=true WHERE id=$1', [id]);
}
