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
import bcrypt from 'bcrypt';
import { validatePassword } from '../utils/passwordUtils';
import { createAgencySchema } from '../schemas/agencySchemas';

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
    const { name, email, password, contactInfo } = parsed.data;
    const existing = await getAgencyByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ message: pwError });
    }
    const hashed = await bcrypt.hash(password, 10);
    const agency = await insertAgency(name, email, hashed, contactInfo);
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
      requestedId === 'me' ? Number(req.user?.id) : Number(requestedId);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    const clientId = Number(req.params.clientId);
    if (!agencyId || !clientId) {
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
    const paramId = requestedId === 'me' ? Number(req.user?.id) : Number(requestedId);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    if (!agencyId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (
      req.user.role === 'agency' &&
      requestedId !== 'me' &&
      agencyId !== paramId
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const clients = await fetchAgencyClients(agencyId);
    res.json(clients);
  } catch (err) {
    next(err);
  }
}
