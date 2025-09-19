import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import pool from '../db';
import {
  getCredential,
  saveCredential,
  getCredentialById,
  updateCredentialSignCount,
} from '../models/webauthn';
import issueAuthTokens, { AuthPayload } from '../utils/authUtils';
import UnauthorizedError from '../utils/UnauthorizedError';
import config from '../config';
import { consumeChallenge, persistChallenge } from '../utils/webauthnChallengeStore';

export async function generateChallenge(req: Request, res: Response) {
  const { identifier } = req.body as { identifier?: string };
  const challenge = randomBytes(32).toString('base64url');
  persistChallenge(challenge, identifier);
  if (identifier) {
    const credential = await getCredential(identifier);
    return res.json({ challenge, registered: !!credential, credentialId: credential?.credentialId });
  }
  res.json({ challenge });
}

export async function registerCredential(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { identifier, credentialId, publicKey, signCount } = req.body as {
    identifier: string;
    credentialId: string;
    publicKey: string;
    signCount: number;
  };
  if (!identifier || !credentialId || !publicKey) {
    return res.status(400).json({ message: 'Missing credential details' });
  }
  try {
    await saveCredential(identifier, credentialId, publicKey, signCount ?? 0);
    const data = await loginByIdentifier(identifier, res, req.get('user-agent'));
    res.json(data);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      next(error);
    }
  }
}

export async function verifyCredential(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const credential = req.body as AuthenticationResponseJSON;
  if (
    !credential?.rawId ||
    !credential?.response?.clientDataJSON ||
    !credential?.response?.authenticatorData ||
    !credential?.response?.signature
  ) {
    return res.status(400).json({ message: 'Missing credential response' });
  }

  try {
    const clientDataJson = Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf8');
    let clientData: {
      challenge?: string;
      origin?: string;
      type?: string;
    };
    try {
      clientData = JSON.parse(clientDataJson);
    } catch {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (clientData.type !== 'webauthn.get') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const { challenge, origin } = clientData;
    if (!challenge || !origin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (origin !== config.webauthnOrigin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const storedChallenge = consumeChallenge(challenge);
    if (!storedChallenge) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const stored = await getCredentialById(credential.rawId);
    if (!stored?.publicKey) {
      throw new UnauthorizedError('Invalid credentials');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: config.webauthnOrigin,
        expectedRPID: config.webauthnRpId,
        credential: {
          id: stored.credentialId,
          publicKey: new Uint8Array(Buffer.from(stored.publicKey, 'base64')),
          counter: stored.signCount,
        },
        requireUserVerification: true,
      });
    } catch {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!verification.verified) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const newCounter = verification.authenticationInfo?.newCounter ?? stored.signCount;
    if (newCounter <= stored.signCount) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await updateCredentialSignCount(stored.credentialId, newCounter);

    const data = await loginByIdentifier(stored.userIdentifier, res, req.get('user-agent'));
    res.json(data);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      next(error);
    }
  }
}

async function loginByIdentifier(
  identifier: string,
  res: Response,
  userAgent?: string | null,
) {
  if (identifier.includes('@')) {
    const volunteerQuery = await pool.query(
      `SELECT v.id, v.first_name, v.last_name, v.user_id, v.consent, u.role AS user_role
       FROM volunteers v
       LEFT JOIN clients u ON v.user_id = u.client_id
       WHERE v.email = $1`,
      [identifier],
    );
    if ((volunteerQuery.rowCount ?? 0) > 0) {
      const volunteer = volunteerQuery.rows[0];
      const rolesRes = await pool.query(
        `SELECT vr.name
         FROM volunteer_trained_roles vtr
         JOIN volunteer_roles vr ON vtr.role_id = vr.id
         WHERE vtr.volunteer_id = $1`,
        [volunteer.id],
      );
      const access: string[] = [];
      if (
        rolesRes.rows.some(
          r => r.name && r.name.toLowerCase() === 'donation entry',
        )
      ) {
        access.push('donation_entry');
      }
      const payload: AuthPayload = {
        id: volunteer.id,
        role: 'volunteer',
        type: 'volunteer',
        ...(access.length && { access }),
        ...(volunteer.user_id && {
          userId: volunteer.user_id,
          userRole: volunteer.user_role || 'shopper',
        }),
      };
      await issueAuthTokens(res, payload, `volunteer:${volunteer.id}`, userAgent);
      return {
        role: 'volunteer',
        name: `${volunteer.first_name} ${volunteer.last_name}`,
        ...(volunteer.user_id && {
          userRole: volunteer.user_role || 'shopper',
        }),
        access,
        id: volunteer.id,
        consent: volunteer.consent,
      };
    }

    const staffQuery = await pool.query(
      `SELECT id, first_name, last_name, role, access, consent FROM staff WHERE email = $1`,
      [identifier],
    );
    if ((staffQuery.rowCount ?? 0) > 0) {
      const staff = staffQuery.rows[0];
      const payload: AuthPayload = {
        id: staff.id,
        role: 'staff',
        type: 'staff',
        access: staff.access || [],
      };
      await issueAuthTokens(res, payload, `staff:${staff.id}`, userAgent);
      return {
        role: 'staff',
        name: `${staff.first_name} ${staff.last_name}`,
        access: staff.access || [],
        id: staff.id,
        consent: staff.consent,
      };
    }

    throw new UnauthorizedError('Invalid credentials');
  }

  const clientId = Number(identifier);
  const userQuery = await pool.query(
    `SELECT client_id, first_name, last_name, role, consent FROM clients WHERE client_id = $1 AND online_access = true`,
    [clientId],
  );
  if ((userQuery.rowCount ?? 0) === 0) {
    throw new UnauthorizedError('Invalid credentials');
  }
  const userRow = userQuery.rows[0];

  const volunteerQuery = await pool.query(
    `SELECT id, first_name, last_name, consent FROM volunteers WHERE user_id = $1`,
    [userRow.client_id],
  );
  if ((volunteerQuery.rowCount ?? 0) > 0) {
    const volunteer = volunteerQuery.rows[0];
    const rolesRes = await pool.query(
      `SELECT vr.name
       FROM volunteer_trained_roles vtr
       JOIN volunteer_roles vr ON vtr.role_id = vr.id
       WHERE vtr.volunteer_id = $1`,
      [volunteer.id],
    );
    const access: string[] = [];
    if (
      rolesRes.rows.some(
        r => r.name && r.name.toLowerCase() === 'donation entry',
      )
    ) {
      access.push('donation_entry');
    }
    const payload: AuthPayload = {
      id: volunteer.id,
      role: 'volunteer',
      type: 'volunteer',
      ...(access.length && { access }),
      userId: userRow.client_id,
      userRole: userRow.role,
    };
    await issueAuthTokens(res, payload, `volunteer:${volunteer.id}`, userAgent);
    return {
      role: 'volunteer',
      name: `${volunteer.first_name} ${volunteer.last_name}`,
      userRole: userRow.role,
      access,
      id: volunteer.id,
      consent: volunteer.consent,
    };
  }

  const payload: AuthPayload = {
    id: userRow.client_id,
    role: userRow.role,
    type: 'user',
  };
  await issueAuthTokens(res, payload, `user:${userRow.client_id}`, userAgent);
  return {
    role: userRow.role,
    name: `${userRow.first_name} ${userRow.last_name}`,
    id: userRow.client_id,
    consent: userRow.consent,
  };
}
