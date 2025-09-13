import pool from '../db';
import { Queryable } from '../models/bookingRepository';

export async function hasTable(table: string, client: Queryable = pool): Promise<boolean> {
  const res = await client.query(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${table}`],
  );
  return res?.rows?.[0]?.exists ?? false;
}
