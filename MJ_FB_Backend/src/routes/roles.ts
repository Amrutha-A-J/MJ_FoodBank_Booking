import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /api/roles - returns unique roles grouped by category
router.get('/', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        c.id            AS category_id,
        c.name          AS category_name,
        r.role_id,
        MIN(r.name)     AS role_name
      FROM volunteer_roles r
      JOIN volunteer_master_roles c ON c.id = r.category_id
      WHERE r.is_active = TRUE
      GROUP BY c.id, c.name, r.role_id
      ORDER BY c.name, role_name;
    `;
    const { rows } = await pool.query(query);
    const result = rows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      roleId: row.role_id,
      roleName: row.role_name,
    }));
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch roles', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/roles/:roleId/shifts - returns all shifts for a role
router.get('/:roleId/shifts', async (req: Request, res: Response) => {
  const roleId = Number(req.params.roleId);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return res.status(400).json({ message: 'Invalid roleId' });
  }
  try {
    const query = `
      SELECT
        r.id AS shift_id,
        r.start_time,
        r.end_time,
        r.max_volunteers
      FROM volunteer_roles r
      WHERE r.is_active = TRUE
        AND r.role_id = $1
      ORDER BY r.start_time;
    `;
    const { rows } = await pool.query(query, [roleId]);
    const result = rows.map((row) => ({
      shiftId: row.shift_id,
      startTime: row.start_time,
      endTime: row.end_time,
      maxVolunteers: row.max_volunteers,
    }));
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch shifts', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

