// src/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import config from './config';
import logger from './utils/logger';

// --- Absolute CA path (use your region's bundle; this is ca-central-1) ---
const CA_PATH = process.env.PGSSLROOTCERT
  || '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem';

// Toggle to temporarily skip verification: PG_INSECURE_SSL=true pm2 restart mjfb-api --update-env
const INSECURE = process.env.PG_INSECURE_SSL === 'true';

// Build ssl config
const ssl = INSECURE
  ? { rejectUnauthorized: false }
  : {
      ca: fs.readFileSync(CA_PATH, 'utf8'),
      rejectUnauthorized: true,
      // SNI hostname must match the Lightsail endpoint DNS
      servername: config.pgHost,
    };

// Helpful startup log so we can see exactly what runtime is using
try {
  logger.info(
    `[PG TLS] host=${config.pgHost} port=${config.pgPort} caPath=${CA_PATH} ` +
    `exists=${fs.existsSync(CA_PATH)} insecure=${INSECURE}`
  );
} catch (e) {
  logger.error('[PG TLS] failed to stat CA_PATH', e);
}

// If you prefer a DATABASE_URL, uncomment and use the alt constructor below
const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,      // EXACT Lightsail endpoint DNS (no IP/CNAME)
  port: config.pgPort,
  database: config.pgDatabase,
  ssl,
});

/*
// Alternative if you have DATABASE_URL in .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});
*/

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
