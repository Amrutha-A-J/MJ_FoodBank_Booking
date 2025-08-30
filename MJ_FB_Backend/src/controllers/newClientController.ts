import { Request, Response, NextFunction } from 'express';
import { fetchNewClients, deleteNewClient as removeNewClient } from '../models/newClient';

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
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    await removeNewClient(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
