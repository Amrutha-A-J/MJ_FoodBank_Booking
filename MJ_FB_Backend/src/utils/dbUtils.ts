import pool from '../db';
import { Queryable } from '../models/bookingRepository';

export async function hasTable(table: string, client: Queryable = pool): Promise<boolean> {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [table],
  );
  return res?.rows?.[0]?.exists ?? false;
}
