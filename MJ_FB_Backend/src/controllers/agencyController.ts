import { Request, Response, NextFunction } from 'express';
import {
  addAgencyClient,
  removeAgencyClient,
  getAgencyClients as fetchAgencyClients,
} from '../models/agency';

export async function addClientToAgency(
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
    if (!agencyId || !req.body.clientId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && requestedId !== 'me' && agencyId !== paramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await addAgencyClient(agencyId, Number(req.body.clientId));
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
    const paramId = Number(req.params.id);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    if (!agencyId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && agencyId !== paramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const clients = await fetchAgencyClients(agencyId);
    res.json(clients);
  } catch (err) {
    next(err);
  }
}
