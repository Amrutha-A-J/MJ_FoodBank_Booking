import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function listVolunteerMasterRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT id, name FROM volunteer_master_roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing volunteer master roles:', error);
    next(error);
  }
}

export async function createVolunteerMasterRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO volunteer_master_roles (name) VALUES ($1) RETURNING id, name',
      [name],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating volunteer master role:', error);
    next(error);
  }
}

export async function updateVolunteerMasterRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE volunteer_master_roles SET name=$1 WHERE id=$2 RETURNING id, name',
      [name, id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating volunteer master role:', error);
    next(error);
  }
}

export async function deleteVolunteerMasterRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM volunteer_master_roles WHERE id=$1 RETURNING id',
      [id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting volunteer master role:', error);
    next(error);
  }
}
