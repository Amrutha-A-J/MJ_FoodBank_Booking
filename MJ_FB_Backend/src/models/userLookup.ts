import pool from '../db';
import { Queryable } from './bookingRepository';

export interface UserLookupResult {
  id: number;
  email: string;
  userType: 'staff' | 'volunteers' | 'clients';
}

export async function findUserByEmail(
  email: string,
  client: Queryable = pool,
): Promise<UserLookupResult | null> {
  const res = await client.query(
    `SELECT id, email, user_type FROM user_lookup WHERE LOWER(email) = LOWER($1) ORDER BY ord LIMIT 1`,
    [email],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  const row = res.rows[0];
  return { id: row.id, email: row.email, userType: row.user_type };
}
