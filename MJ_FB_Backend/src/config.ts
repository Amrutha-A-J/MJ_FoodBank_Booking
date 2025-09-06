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
  EMAIL_QUEUE_MAX_RETRIES: z.coerce.number().default(5),
  EMAIL_QUEUE_BACKOFF_MS: z.coerce.number().default(1000),
  PASSWORD_SETUP_TEMPLATE_ID: z.coerce.number().default(6),
  BOOKING_CONFIRMATION_TEMPLATE_ID: z.coerce.number().default(0),
  BOOKING_REMINDER_TEMPLATE_ID: z.coerce.number().default(0),
  BOOKING_STATUS_TEMPLATE_ID: z.coerce.number().default(0),
  AGENCY_CLIENT_UPDATE_TEMPLATE_ID: z.coerce.number().default(0),
  VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID: z.coerce.number().default(0),
  VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID: z.coerce.number().default(0),
  VOLUNTEER_NO_SHOW_HOURS: z.coerce.number().default(24),
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
  emailQueueMaxRetries: env.EMAIL_QUEUE_MAX_RETRIES,
  emailQueueBackoffMs: env.EMAIL_QUEUE_BACKOFF_MS,
  passwordSetupTemplateId: env.PASSWORD_SETUP_TEMPLATE_ID,
  bookingConfirmationTemplateId: env.BOOKING_CONFIRMATION_TEMPLATE_ID,
  bookingReminderTemplateId: env.BOOKING_REMINDER_TEMPLATE_ID,
  bookingStatusTemplateId: env.BOOKING_STATUS_TEMPLATE_ID,
  agencyClientUpdateTemplateId: env.AGENCY_CLIENT_UPDATE_TEMPLATE_ID,
  volunteerBookingConfirmationTemplateId: env.VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID,
  volunteerBookingReminderTemplateId: env.VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID,
  volunteerNoShowHours: env.VOLUNTEER_NO_SHOW_HOURS,
};
