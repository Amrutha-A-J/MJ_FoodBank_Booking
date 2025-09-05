import { Pool } from 'pg';
import fs from 'fs';
import config from './config';
import logger from './utils/logger';

const CA_REGIONAL = '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem';
const CA_GLOBAL   = '/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-global-bundle.pem';

const caPath = process.env.PGSSLROOTCERT && fs.existsSync(process.env.PGSSLROOTCERT)
  ? process.env.PGSSLROOTCERT
  : (fs.existsSync(CA_REGIONAL) ? CA_REGIONAL : CA_GLOBAL);

const pool = new Pool({
  user: config.pgUser,
  password: config.pgPassword,
  host: config.pgHost,      // MUST be the exact Lightsail endpoint hostname
  port: config.pgPort,
  database: config.pgDatabase,
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
    servername: config.pgHost,  // SNI must match the endpoint hostname
  },
});

pool.on('error', (err) => logger.error('Unexpected PG pool error', err));
export default pool;
