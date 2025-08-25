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
