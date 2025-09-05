import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

const caPath =
  process.env.PGSSLROOTCERT ||
  path.resolve(process.cwd(), 'certs/rds-global-bundle.pem');

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
    servername: config.pgHost, // ensure hostname matches cert
  },
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
