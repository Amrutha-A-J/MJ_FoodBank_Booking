import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const envSchema = z.object({
  PG_USER: z.string().default('postgres'),
  PG_PASSWORD: z.string().default('password'),
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().default(5432),
  PG_DATABASE: z.string().default('mj_fb_db'),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  PORT: z.coerce.number().default(4000),
  POWER_AUTOMATE_URL: z.string().optional(),
  POWER_AUTOMATE_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

const frontendOrigins = env.FRONTEND_ORIGIN.split(',').map(o => o.trim());

const requiredVars: Array<keyof typeof env> = [
  'PG_USER',
  'PG_PASSWORD',
  'PG_HOST',
  'PG_PORT',
  'PG_DATABASE',
  'FRONTEND_ORIGIN',
];

const missing = requiredVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`Missing environment variables: ${missing.join(', ')}`);
}

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
