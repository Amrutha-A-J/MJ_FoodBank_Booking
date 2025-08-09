import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listVolunteerMasterRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT id, name, is_active FROM volunteer_master_roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing volunteer master roles:', error);
    next(error);
  }
}

export async function updateVolunteerMasterRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE volunteer_master_roles SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
      [isActive, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating volunteer master role:', error);
    next(error);
  }
}
