import pool from '../db';

export interface WebAuthnCredential {
  userIdentifier: string;
  credentialId: string;
  publicKey: string;
  signCount: number;
}

export async function getCredential(
  userIdentifier: string,
): Promise<WebAuthnCredential | null> {
  const res = await pool.query(
    `SELECT user_identifier, credential_id, public_key, sign_count
     FROM webauthn_credentials WHERE user_identifier = $1`,
    [userIdentifier],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0];
  return {
    userIdentifier: row.user_identifier,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    signCount: row.sign_count ?? 0,
  };
}

export async function getCredentialById(
  credentialId: string,
): Promise<WebAuthnCredential | null> {
  const res = await pool.query(
    `SELECT user_identifier, credential_id, public_key, sign_count
     FROM webauthn_credentials WHERE credential_id = $1`,
    [credentialId],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0];
  return {
    userIdentifier: row.user_identifier,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    signCount: row.sign_count ?? 0,
  };
}

export async function saveCredential(
  userIdentifier: string,
  credentialId: string,
  publicKey: string,
  signCount: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO webauthn_credentials (user_identifier, credential_id, public_key, sign_count)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_identifier) DO UPDATE
     SET credential_id = EXCLUDED.credential_id,
         public_key = EXCLUDED.public_key,
         sign_count = EXCLUDED.sign_count`,
    [userIdentifier, credentialId, publicKey, signCount],
  );
}

export async function updateCredentialSignCount(
  credentialId: string,
  signCount: number,
): Promise<void> {
  await pool.query(
    `UPDATE webauthn_credentials
     SET sign_count = $2
     WHERE credential_id = $1`,
    [credentialId, signCount],
  );
}
