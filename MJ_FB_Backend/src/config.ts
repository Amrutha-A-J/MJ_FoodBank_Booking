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
  // Domain attribute applied to authentication cookies
  COOKIE_DOMAIN: z.string().optional(),
  PORT: z.coerce.number().default(4000),
  BREVO_API_KEY: z.string().optional(),
  BREVO_FROM_EMAIL: z.string().optional(),
  BREVO_FROM_NAME: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  logger.error('❌ Invalid or missing environment variables:', parsedEnv.error.format());
  throw parsedEnv.error;
}

const env = parsedEnv.data;

const frontendOrigins = env.FRONTEND_ORIGIN
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export default {
  pgUser: env.PG_USER,
  pgPassword: env.PG_PASSWORD,
  pgHost: env.PG_HOST,
  pgPort: env.PG_PORT,
  pgDatabase: env.PG_DATABASE,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  frontendOrigins,
  cookieDomain: env.COOKIE_DOMAIN,
  port: env.PORT,
  brevoApiKey: env.BREVO_API_KEY ?? '',
  brevoFromEmail: env.BREVO_FROM_EMAIL ?? '',
  brevoFromName: env.BREVO_FROM_NAME ?? '',
};
