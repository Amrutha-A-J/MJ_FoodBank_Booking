// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';

/**
 * Use the REGIONAL RDS trust bundle for your region.
 * Adjust the path if your project lives elsewhere or your region isn't ca-central-1.
 */
const CA_PATH = '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem';

// Toggle: set PG_INSECURE_SSL=true to skip cert verification TEMPORARILY (for debugging)
const INSECURE = process.env.PG_INSECURE_SSL === 'true';

// Build a tight SSL object. We DO NOT rely on env-driven ssl/sslmode here.
// We pass host/user/password/port/db explicitly so pg won't fall back to env defaults.
const ssl = INSECURE
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
