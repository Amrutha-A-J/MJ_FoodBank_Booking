import { Pool } from 'pg';
import config from './config';
import logger from './utils/logger';

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
