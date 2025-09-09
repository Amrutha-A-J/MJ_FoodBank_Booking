import pool from '../db';

export async function savePushSubscription(
  userId: number,
  userRole: string,
  subscription: unknown,
) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, user_role, subscription)
     VALUES ($1, $2, $3)`,
    [userId, userRole, subscription],
  );
}
