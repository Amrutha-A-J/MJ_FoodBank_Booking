import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import config from './config';
import logger from './utils/logger';

const defaultCA = path.resolve(process.cwd(), 'certs/rds-global-bundle.pem');
const caPath = process.env.PGSSLROOTCERT || defaultCA;
const ssl = fs.existsSync(caPath)
  ? {
      ca: fs.readFileSync(caPath, 'utf8'),
      rejectUnauthorized: true,
      servername: process.env.PGHOST,
    }
  : undefined;

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  ssl,
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
