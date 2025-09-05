import { Pool } from 'pg';
import fs from 'fs';
import config from './config';
import logger from './utils/logger';

// Use the regional bundle first; fall back to global
const caPath =
  process.env.PGSSLROOTCERT
  || '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem'  // <-- change region if needed
  || '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-global-bundle.pem';

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,       // must be the EXACT Lightsail endpoint hostname (no IPs)
  port: config.pgPort,
  database: config.pgDatabase,
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
    servername: config.pgHost,  // SNI => must match endpoint hostname
  },
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));
export default pool;
