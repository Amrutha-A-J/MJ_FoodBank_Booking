import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import {
  addAgencyClient,
  removeAgencyClient,
  createAgency as createAgencyModel,
} from '../models/agency';

export async function createAgency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { name, email, password, contactInfo } = req.body as {
      name: string;
      email: string;
      password: string;
      contactInfo?: string;
    };
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const agency = await createAgencyModel(
      name,
      email,
      hashed,
      contactInfo,
    );
    res.status(201).json({
      id: agency.id,
      name: agency.name,
      email: agency.email,
      contactInfo: agency.contact_info,
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Agency already exists' });
    }
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
    const paramId = Number(req.params.id);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    if (!agencyId || !req.body.clientId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && agencyId !== paramId) {
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
    const paramId = Number(req.params.id);
    const agencyId = req.user.role === 'agency' ? Number(req.user.id) : paramId;
    const clientId = Number(req.params.clientId);
    if (!agencyId || !clientId) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (req.user.role === 'agency' && agencyId !== paramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await removeAgencyClient(agencyId, clientId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
