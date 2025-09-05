import { Pool } from 'pg';
import fs from 'fs';
import config from './config';
import logger from './utils/logger';

// Absolute path to the CA file (regional bundle works best for Lightsail in ca-central-1)
const caPath =
  process.env.PGSSLROOTCERT ||
  '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem';

// 👇 Toggle between secure + insecure TLS by env
const INSECURE = process.env.PG_INSECURE_SSL === 'true';

const ssl = INSECURE
  ? { rejectUnauthorized: false } // ⚠️ insecure mode — skips cert verification
  : {
      ca: fs.readFileSync(caPath, 'utf8'),
      rejectUnauthorized: true,
      servername: config.pgHost, // must match your Lightsail endpoint DNS
    };

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  ssl, // <- use the toggle
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));

export default pool;
