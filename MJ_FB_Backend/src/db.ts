import { Pool } from 'pg';
import config from './config';

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
});
export default pool;
