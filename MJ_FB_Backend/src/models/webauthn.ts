import pool from '../db';

export interface WebAuthnCredential {
  userIdentifier: string;
  credentialId: string;
}

export async function getCredential(
  userIdentifier: string,
): Promise<WebAuthnCredential | null> {
  const res = await pool.query(
    'SELECT user_identifier, credential_id FROM webauthn_credentials WHERE user_identifier = $1',
    [userIdentifier],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0];
  return { userIdentifier: row.user_identifier, credentialId: row.credential_id };
}

export async function getCredentialById(
  credentialId: string,
): Promise<WebAuthnCredential | null> {
  const res = await pool.query(
    'SELECT user_identifier, credential_id FROM webauthn_credentials WHERE credential_id = $1',
    [credentialId],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0];
  return { userIdentifier: row.user_identifier, credentialId: row.credential_id };
}

export async function saveCredential(
  userIdentifier: string,
  credentialId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO webauthn_credentials (user_identifier, credential_id)
     VALUES ($1, $2)
     ON CONFLICT (user_identifier) DO UPDATE SET credential_id = EXCLUDED.credential_id`,
    [userIdentifier, credentialId],
  );
}
