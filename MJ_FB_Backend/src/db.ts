// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

const isLocal = ['localhost', '127.0.0.1'].includes(config.pgHost);

let ssl: any;
if (!isLocal) {
  /**
   * Path to the RDS CA bundle.
   * Defaults to the global bundle in certs but can be overridden with PG_CA_CERT.
   */
  const CA_PATH = process.env.PG_CA_CERT ||
    path.join(__dirname, '../certs/rds-global-bundle.pem');

  // Toggle: set PG_INSECURE_SSL=true to skip cert verification TEMPORARILY (for debugging)
  const INSECURE = process.env.PG_INSECURE_SSL === 'true';

  // Build a tight SSL object. We DO NOT rely on env-driven ssl/sslmode here.
  // We pass host/user/password/port/db explicitly so pg won't fall back to env defaults.
  ssl = INSECURE
    ? { rejectUnauthorized: false as const }
    : {
        ca: fs.readFileSync(CA_PATH, 'utf8'),
        rejectUnauthorized: true as const,
        servername: config.pgHost, // SNI must match your Lightsail endpoint DNS
      };

  // Helpful startup log to verify what the process is *actually* using.
  try {
    const exists = fs.existsSync(CA_PATH);
    logger.info(
      `[PG TLS] host=${config.pgHost} port=${config.pgPort} ` +
      `caPath=${CA_PATH} exists=${exists} insecure=${INSECURE}`
    );
  } catch (e) {
    logger.error('[PG TLS] failed to stat CA_PATH', e);
  }
} else {
  logger.info('[PG TLS] using plaintext connection for local development');
}

const pool = new Pool({
  host: config.pgHost,          // EXACT Lightsail endpoint DNS (no IP/CNAME)
  port: Number(config.pgPort),
  user: config.pgUser,
  password: config.pgPassword,
  database: config.pgDatabase,
  ssl,                          // <- our ssl object (only source of truth)
  // IMPORTANT: do NOT pass connectionString here; it can reintroduce env sslmode.
  // Also, we intentionally avoid relying on PG* env vars to prevent overrides.
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
