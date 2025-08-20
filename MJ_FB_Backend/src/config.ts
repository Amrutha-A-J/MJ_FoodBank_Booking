import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './utils/logger';

dotenv.config();

const envSchema = z.object({
  PG_USER: z.string(),
  PG_PASSWORD: z.string(),
  PG_HOST: z.string(),
  PG_PORT: z.coerce.number(),
  PG_DATABASE: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  FRONTEND_ORIGIN: z.string(),
  PORT: z.coerce.number().default(4000),
  POWER_AUTOMATE_URL: z.string().optional(),
  POWER_AUTOMATE_KEY: z.string().optional(),
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  logger.error('❌ Invalid or missing environment variables:', err);
  process.exit(1);
}

const frontendOrigins = env.FRONTEND_ORIGIN.split(',').map(o => o.trim());

export default {
  pgUser: env.PG_USER,
  pgPassword: env.PG_PASSWORD,
  pgHost: env.PG_HOST,
  pgPort: env.PG_PORT,
  pgDatabase: env.PG_DATABASE,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  frontendOrigins,
  port: env.PORT,
  powerAutomateUrl: env.POWER_AUTOMATE_URL ?? '',
  powerAutomateKey: env.POWER_AUTOMATE_KEY ?? '',
};
