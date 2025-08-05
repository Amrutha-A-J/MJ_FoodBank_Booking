import { Request, Response } from 'express';
import pool from '../db';

export async function updateTrainedAreas(req: Request, res: Response) {
  const { id } = req.params;
  const { trainedAreas } = req.body as { trainedAreas?: string[] };
  if (!Array.isArray(trainedAreas)) {
    return res.status(400).json({ message: 'trainedAreas must be an array' });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteers SET trained_areas = $1 WHERE id = $2 RETURNING id, trained_areas`,
      [trainedAreas, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trained areas:', error);
    res.status(500).json({
      message: `Database error updating trained areas: ${(error as Error).message}`,
    });
  }
}
