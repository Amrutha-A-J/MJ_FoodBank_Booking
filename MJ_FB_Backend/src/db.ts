// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

// Toggle: TEMPORARY ONLY. If true, skips cert verification.
const INSECURE = process.env.PG_INSECURE_SSL === 'true';

// Where we’ll look for a CA bundle (in order)
const projectRoot = path.join(__dirname, '..'); // src -> project root
const certDir = path.join(projectRoot, 'certs');

const CANDIDATE_CA_PATHS = [
  process.env.PGSSLROOTCERT,                                        // explicit env override
  path.join(certDir, 'rds-global-bundle.pem'),                      // your downloaded global bundle
  path.join(certDir, 'rds-ca-central-1-bundle.pem'),                // regional fallback
  // As a last resort, many distros bundle roots here (not ideal for RDS pinning, but better than crashing):
  '/etc/ssl/certs/ca-certificates.crt',
].filter(Boolean) as string[];

function loadCA(): { ca?: string; usedPath?: string } {
  for (const p of CANDIDATE_CA_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const ca = fs.readFileSync(p, 'utf8');
        return { ca, usedPath: p };
      }
    } catch (e) {
      logger.warn(`[PG TLS] Could not read CA at ${p}: ${(e as Error).message}`);
    }
  }
  return {};
}

const { ca, usedPath } = loadCA();

// Build SSL config
const ssl = INSECURE
  ? ({ rejectUnauthorized: false as const })
  : ({
      ...(ca ? { ca } : {}),
      rejectUnauthorized: true as const,
      // IMPORTANT: this must be your **database hostname** (e.g., RDS endpoint), not an IP.
      servername: config.pgHost,
    });

// Helpful startup logs
logger.info(
  `[PG TLS] host=${config.pgHost} port=${config.pgPort} insecure=${INSECURE} ` +
  `caPath=${usedPath ?? 'none'}`
);

// Create the pool using explicit fields (avoid connectionString/env sslmode surprises)
const pool = new Pool({
  host: config.pgHost,                 // Use your RDS/DB hostname here
  port: Number(config.pgPort),
  user: config.pgUser,
  password: config.pgPassword,
  database: config.pgDatabase,
  ssl,
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
