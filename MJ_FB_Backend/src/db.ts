// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

const isLocal = ['localhost', '127.0.0.1'].includes(config.pgHost);

// Default CA path inside the repo
const DEFAULT_CA = path.join(__dirname, '../certs/rds-ca-central-1-bundle.pem');
// Allow overriding via env PG_CA_CERT=/path/to/your.pem
const CA_PATH = process.env.PG_CA_CERT || DEFAULT_CA;

let ssl: any | undefined;

if (!isLocal) {
  if (!fs.existsSync(CA_PATH)) {
    throw new Error(`[PG TLS] CA bundle not found at ${CA_PATH}. Set PG_CA_CERT to override.`);
  }
  const ca = fs.readFileSync(CA_PATH, 'utf8');

  ssl = {
    ca,                          // <- custom CA bundle from your repo
    rejectUnauthorized: true as const,
    servername: config.pgHost,   // must exactly match your RDS endpoint DNS
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
  ssl, // only custom CA in non-local environments
  // Avoid connectionString so PG* env vars can’t override sslmode.
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
