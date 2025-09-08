import { Request, Response, NextFunction } from 'express';
import {
  addAgencyClient,
    removeAgencyClient,
    getAgencyClients as fetchAgencyClients,
    createAgency as insertAgency,
    getAgencyByEmail,
    getAgencyForClient,
    clientExists,
    searchAgencies as findAgencies,
  } from '../models/agency';
import { createAgencySchema } from '../schemas/agencySchemas';
import { generatePasswordSetupToken, buildPasswordSetupEmailParams } from '../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../utils/emailUtils';
import config from '../config';
import { parseIdParam } from '../utils/parseIdParam';

export async function createAgency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const parsed = createAgencySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }
    const { name, email, contactInfo } = parsed.data;
    const existing = await getAgencyByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const agency = await insertAgency(name, email, contactInfo);
    const token = await generatePasswordSetupToken('agencies', agency.id);
    const params = buildPasswordSetupEmailParams('agencies', token);
    await sendTemplatedEmail({
      to: email,
      templateId: config.passwordSetupTemplateId,
      params,
    });
    res.status(201).json({ id: agency.id });
  } catch (err) {
    next(err);
  }
}

export async function searchAgencies(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const q = (req.query.search as string) || '';
    if (q.length < 3) {
      return res.json([]);
    }
    const agencies = await findAgencies(q);
    res.json(agencies);
  } catch (err) {
    next(err);
  }
}

export async function addClientToAgency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'agency')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const requestedAgencyId = req.body.agencyId;
    const bodyId =
      requestedAgencyId === 'me'
        ? Number(req.user?.id)
        : Number(requestedAgencyId);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : bodyId;
    const clientId = Number(req.body.clientId);
    if (!bodyId || !clientId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && agencyId !== bodyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!(await clientExists(clientId))) {
      return res.status(404).json({ message: 'Client not found' });
    }
    const existing = await getAgencyForClient(clientId);
    if (existing) {
      return res.status(409).json({
        message: `Client already associated with ${existing.name}`,
        agencyName: existing.name,
      });
    }
    await addAgencyClient(agencyId, clientId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function removeClientFromAgency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'agency')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const requestedId = req.params.id;
    const paramId =
      requestedId === 'me' ? Number(req.user?.id) : parseIdParam(requestedId);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    const clientId = parseIdParam(req.params.clientId);
    if (agencyId == null || clientId == null) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && requestedId !== 'me' && agencyId !== paramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await removeAgencyClient(agencyId, clientId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getAgencyClients(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'agency')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const requestedId = req.params.id;
    const paramId =
      requestedId === 'me' ? Number(req.user?.id) : parseIdParam(requestedId);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    if (agencyId == null) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (
      req.user.role === 'agency' &&
      requestedId !== 'me' &&
      agencyId !== paramId
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const search = req.query.search as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;
    let limit = 25;
    if (limitParam !== undefined) {
      const parsed = Number(limitParam);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return res.status(400).json({ message: 'Invalid limit' });
      }
      limit = Math.min(parsed, 100);
    }
    let offset = 0;
    if (offsetParam !== undefined) {
      const parsed = Number(offsetParam);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'Invalid offset' });
      }
      offset = parsed;
    }
    const clients = await fetchAgencyClients(agencyId, search, limit, offset);
    res.json(clients);
  } catch (err) {
    next(err);
  }
}
