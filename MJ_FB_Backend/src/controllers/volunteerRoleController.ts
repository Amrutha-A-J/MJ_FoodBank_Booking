import { Request, Response } from 'express';
import pool from '../db';

export async function addVolunteerRole(req: Request, res: Response) {
  const { name, category } = req.body as { name?: string; category?: string };
  if (!name || !category) {
    return res.status(400).json({ message: 'Name and category are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO volunteer_roles_master (name, category) VALUES ($1, $2) RETURNING id, name, category`,
      [name, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding volunteer role:', error);
    res.status(500).json({
      message: `Database error adding volunteer role: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerRoles(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, name, category FROM volunteer_roles_master ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing volunteer roles:', error);
    res.status(500).json({
      message: `Database error listing volunteer roles: ${(error as Error).message}`,
    });
  }
}

export async function updateVolunteerRole(req: Request, res: Response) {
  const { id } = req.params;
  const { name, category } = req.body as { name?: string; category?: string };
  if (!name || !category) {
    return res.status(400).json({ message: 'Name and category are required' });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteer_roles_master SET name = $1, category = $2 WHERE id = $3 RETURNING id, name, category`,
      [name, category, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating volunteer role:', error);
    res.status(500).json({
      message: `Database error updating volunteer role: ${(error as Error).message}`,
    });
  }
}

export async function deleteVolunteerRole(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM volunteer_roles_master WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error('Error deleting volunteer role:', error);
    res.status(500).json({
      message: `Database error deleting volunteer role: ${(error as Error).message}`,
    });
  }
}
