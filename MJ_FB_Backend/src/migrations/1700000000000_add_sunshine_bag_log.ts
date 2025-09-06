import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE sunshine_bag_log (
      date DATE PRIMARY KEY,
      weight INTEGER NOT NULL
    );
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS sunshine_bag_log');
}
