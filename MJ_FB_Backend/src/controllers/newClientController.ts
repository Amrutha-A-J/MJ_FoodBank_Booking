import { Request, Response, NextFunction } from 'express';
import { fetchNewClients, deleteNewClient as removeNewClient } from '../models/newClient';
import { parseIdParam } from '../utils/parseIdParam';

export async function getNewClients(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const clients = await fetchNewClients();
    res.json(clients);
  } catch (err) {
    next(err);
  }
}

export async function deleteNewClient(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    await removeNewClient(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
