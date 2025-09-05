// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

// --- TLS controls ------------------------------------------------------------
// PG_INSECURE_SSL=true  -> temporarily skip verification (ONLY for emergency debug)
// PGSSLROOTCERT=<abs path to a PEM> -> optional custom CA; if missing, falls back to system roots
const INSECURE = process.env.PG_INSECURE_SSL === 'true';
const PGSSLROOTCERT = process.env.PGSSLROOTCERT;

// Try to load a custom CA if PGSSLROOTCERT is set; otherwise use system roots.
function buildTls() {
  if (INSECURE) {
    logger.warn('[PG TLS] INSECURE mode enabled: rejectUnauthorized=false');
    return { rejectUnauthorized: false as const };
  }

  if (PGSSLROOTCERT) {
    try {
      const resolved = path.resolve(PGSSLROOTCERT);
      if (fs.existsSync(resolved)) {
        const ca = fs.readFileSync(resolved, 'utf8');
        logger.info(`[PG TLS] Using custom CA at ${resolved}`);
        // No explicit 'servername'—node-postgres will set SNI to host automatically.
        return { ca, rejectUnauthorized: true as const };
      } else {
        logger.warn(`[PG TLS] PGSSLROOTCERT set but file not found: ${resolved}. Falling back to system CAs.`);
      }
    } catch (e) {
      logger.warn(`[PG TLS] Failed to read PGSSLROOTCERT (${PGSSLROOTCERT}): ${(e as Error).message}. Falling back to system CAs.`);
    }
  }

  logger.info('[PG TLS] Using system trust store (recommended for AWS RDS/Lightsail).');
  return { rejectUnauthorized: true as const };
}

const ssl = buildTls();

// --- Pool --------------------------------------------------------------------
const pool = new Pool({
  host: config.pgHost,                 // e.g., *.rds.amazonaws.com (hostname, not IP)
  port: Number(config.pgPort),
  user: config.pgUser,
  password: config.pgPassword,
  database: config.pgDatabase,
  ssl,                                 // Built above; no connectionString to avoid sslmode surprises
});

// Helpful startup log
logger.info(
  `[PG] Connecting host=${config.pgHost} port=${config.pgPort} db=${config.pgDatabase} ` +
  `insecure=${INSECURE} customCA=${Boolean(PGSSLROOTCERT)}`
);

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
