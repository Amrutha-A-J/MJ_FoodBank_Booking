import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
});

// Test the connection
pool.connect()
  .then(() => console.log('✅ Connected to the database successfully!'))
  .catch(err => console.error('❌ Failed to connect to the database:', err));

export default pool;