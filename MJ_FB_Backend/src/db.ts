import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import config from './config';
import logger from './utils/logger';

const caPath = path.join(__dirname, '../certs/rds-global-bundle.pem');

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
  },
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
