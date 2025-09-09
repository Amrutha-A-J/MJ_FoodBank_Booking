import pool from '../db';

export interface WebAuthnCredential {
  user_id: number;
  user_type: string;
  credential_id: string;
}

export async function saveWebAuthnCredential(
  userId: number,
  userType: string,
  credentialId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, user_type, credential_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (credential_id) DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type`,
    [userId, userType, credentialId],
  );
}

export async function findWebAuthnCredential(
  credentialId: string,
): Promise<WebAuthnCredential | null> {
  const res = await pool.query(
    `SELECT user_id, user_type, credential_id
     FROM webauthn_credentials
     WHERE credential_id = $1`,
    [credentialId],
  );
  return (res.rows[0] as WebAuthnCredential) || null;
}
