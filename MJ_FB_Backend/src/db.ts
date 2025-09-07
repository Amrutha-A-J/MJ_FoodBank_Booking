// src/db.ts
import { Pool, types } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

// Ensure DATE columns are returned as plain strings (YYYY-MM-DD)
types.setTypeParser(1082, (val) => val);

const isLocal = ['localhost', '127.0.0.1'].includes(config.pgHost);

// Default CA path (regional bundle for ca-central-1)
const DEFAULT_CA = path.join(__dirname, '../certs/rds-ca-central-1-bundle.pem');
// Allow override via env PG_CA_CERT
const CA_PATH = process.env.PG_CA_CERT || DEFAULT_CA;

let ssl: any | undefined;

if (!isLocal) {
  if (!fs.existsSync(CA_PATH)) {
    throw new Error(`[PG TLS] CA bundle not found at ${CA_PATH}. Set PG_CA_CERT to override.`);
  }

  const ca = fs.readFileSync(CA_PATH, 'utf8');

  ssl = {
    ca,                          // use the custom CA bundle
    rejectUnauthorized: true as const,
    servername: config.pgHost,   // must match your RDS endpoint DNS
  };

  logger.info(`[PG TLS] Using custom CA at ${CA_PATH}, host=${config.pgHost}, port=${config.pgPort}`);
} else {
  logger.info('[PG TLS] Local development: plaintext connection');
}

const pool = new Pool({
  host: config.pgHost,
  port: Number(config.pgPort),
  user: config.pgUser,
  password: config.pgPassword,
  database: config.pgDatabase,
  ssl, // always require SSL with the CA bundle in non-local env
  // Avoid connectionString so PG* env vars can’t override sslmode
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
