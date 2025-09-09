import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import issueAuthTokens, { AuthPayload } from '../utils/authUtils';
import { saveWebAuthnCredential, findWebAuthnCredential } from '../models/webauthn';

export async function registerCredential(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { credentialId } = req.body as { credentialId?: string };
  if (!credentialId) {
    return res.status(400).json({ message: 'credentialId required' });
  }
  await saveWebAuthnCredential(req.user.id, req.user.role, credentialId);
  res.status(201).json({ ok: true });
}

export async function verifyCredential(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { credentialId } = req.body as { credentialId?: string };
  if (!credentialId) return res.status(400).json({ message: 'credentialId required' });
  try {
    const cred = await findWebAuthnCredential(credentialId);
    if (!cred) return res.status(401).json({ message: 'Invalid credential' });
    if (cred.user_type === 'staff') {
      const result = await pool.query(
        `SELECT id, first_name, last_name, access FROM staff WHERE id = $1`,
        [cred.user_id],
      );
      if ((result.rowCount ?? 0) === 0) return res.status(401).json({ message: 'Invalid credential' });
      const row = result.rows[0];
      const payload: AuthPayload = {
        id: row.id,
        role: 'staff',
        type: 'staff',
        access: row.access || [],
      };
      await issueAuthTokens(res, payload, `staff:${row.id}`);
      return res.json({ role: 'staff', name: `${row.first_name} ${row.last_name}`, access: row.access || [], id: row.id });
    }
    if (cred.user_type === 'volunteer') {
      const volRes = await pool.query(
        `SELECT v.id, v.first_name, v.last_name, v.user_id, u.role AS user_role
         FROM volunteers v
         LEFT JOIN clients u ON v.user_id = u.client_id
         WHERE v.id = $1`,
        [cred.user_id],
      );
      if ((volRes.rowCount ?? 0) === 0) return res.status(401).json({ message: 'Invalid credential' });
      const vol = volRes.rows[0];
      const rolesRes = await pool.query(
        `SELECT vr.name
         FROM volunteer_trained_roles vtr
         JOIN volunteer_roles vr ON vtr.role_id = vr.id
         WHERE vtr.volunteer_id = $1`,
        [vol.id],
      );
      const access: string[] = [];
      if (rolesRes.rows.some(r => r.name === 'Donation Entry')) access.push('donation_entry');
      const payload: AuthPayload = {
        id: vol.id,
        role: 'volunteer',
        type: 'volunteer',
        ...(access.length && { access }),
        ...(vol.user_id && { userId: vol.user_id, userRole: vol.user_role || 'shopper' }),
      };
      await issueAuthTokens(res, payload, `volunteer:${vol.id}`);
      return res.json({
        role: 'volunteer',
        name: `${vol.first_name} ${vol.last_name}`,
        ...(vol.user_id && { userRole: vol.user_role || 'shopper' }),
        access,
        id: vol.id,
      });
    }
    if (cred.user_type === 'agency') {
      const result = await pool.query(
        `SELECT id, name FROM agencies WHERE id = $1`,
        [cred.user_id],
      );
      if ((result.rowCount ?? 0) === 0) return res.status(401).json({ message: 'Invalid credential' });
      const row = result.rows[0];
      const payload: AuthPayload = { id: row.id, role: 'agency', type: 'agency' };
      await issueAuthTokens(res, payload, `agency:${row.id}`);
      return res.json({ role: 'agency', name: row.name, id: row.id, access: [] });
    }
    // default to client user
    const userRes = await pool.query(
      `SELECT client_id, first_name, last_name, role FROM clients WHERE client_id = $1 AND online_access = true`,
      [cred.user_id],
    );
    if ((userRes.rowCount ?? 0) === 0) return res.status(401).json({ message: 'Invalid credential' });
    const user = userRes.rows[0];
    const payload: AuthPayload = { id: user.client_id, role: user.role, type: 'user' };
    await issueAuthTokens(res, payload, `user:${user.client_id}`);
    return res.json({ role: user.role, name: `${user.first_name} ${user.last_name}`, id: user.client_id });
  } catch (err) {
    next(err);
  }
}
