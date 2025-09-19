import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './utils/logger';

if (process.env.NODE_ENV !== 'test') dotenv.config();

const envSchema = z.object({
  PG_USER: z.string(),
  PG_PASSWORD: z.string(),
  PG_HOST: z.string(),
  PG_PORT: z.coerce.number(),
  PG_POOL_MAX: z.coerce.number().default(10),
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
  EMAIL_QUEUE_MAX_AGE_DAYS: z.coerce.number().default(30),
  EMAIL_QUEUE_WARNING_SIZE: z.coerce.number().default(100),
  ICS_BASE_URL: z.string().optional(),
  PASSWORD_SETUP_TEMPLATE_ID: z.coerce.number().default(6),
  BOOKING_CONFIRMATION_TEMPLATE_ID: z.coerce.number().default(0),
  BOOKING_REMINDER_TEMPLATE_ID: z.coerce.number().default(0),
  CLIENT_RESCHEDULE_TEMPLATE_ID: z.coerce.number().default(10),
  VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID: z.coerce.number().default(0),
  VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID: z.coerce.number().default(0),
  VOLUNTEER_RESCHEDULE_TEMPLATE_ID: z.coerce.number().default(10),
  DELIVERY_REQUEST_TEMPLATE_ID: z.coerce.number().default(16),
  DONOR_TEMPLATE_ID_1_100: z.coerce.number().default(11),
  DONOR_TEMPLATE_ID_101_500: z.coerce.number().default(12),
  DONOR_TEMPLATE_ID_501_1000: z.coerce.number().default(13),
  DONOR_TEMPLATE_ID_1001_10000: z.coerce.number().default(14),
  DONOR_TEMPLATE_ID_10001_30000: z.coerce.number().default(15),
  VOLUNTEER_NO_SHOW_HOURS: z.coerce.number().default(24),
  VACUUM_ALERT_DEAD_ROWS_THRESHOLD: z.coerce.number().default(5000),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALERT_CHAT_ID: z.string().optional(),
  WEBAUTHN_RP_ID: z.string(),
  WEBAUTHN_ORIGIN: z.string(),
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
  pgPoolMax: env.PG_POOL_MAX,
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
  emailQueueMaxAgeDays: env.EMAIL_QUEUE_MAX_AGE_DAYS,
  emailQueueWarningSize: env.EMAIL_QUEUE_WARNING_SIZE,
  icsBaseUrl: env.ICS_BASE_URL ?? '',
  passwordSetupTemplateId: env.PASSWORD_SETUP_TEMPLATE_ID,
  bookingConfirmationTemplateId: env.BOOKING_CONFIRMATION_TEMPLATE_ID,
  bookingReminderTemplateId: env.BOOKING_REMINDER_TEMPLATE_ID,
  clientRescheduleTemplateId: env.CLIENT_RESCHEDULE_TEMPLATE_ID,
  volunteerBookingConfirmationTemplateId: env.VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID,
  volunteerBookingReminderTemplateId: env.VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID,
  volunteerRescheduleTemplateId: env.VOLUNTEER_RESCHEDULE_TEMPLATE_ID,
  deliveryRequestTemplateId: env.DELIVERY_REQUEST_TEMPLATE_ID,
  donorTemplateId1To100: env.DONOR_TEMPLATE_ID_1_100,
  donorTemplateId101To500: env.DONOR_TEMPLATE_ID_101_500,
  donorTemplateId501To1000: env.DONOR_TEMPLATE_ID_501_1000,
  donorTemplateId1001To10000: env.DONOR_TEMPLATE_ID_1001_10000,
  donorTemplateId10001To30000: env.DONOR_TEMPLATE_ID_10001_30000,
  volunteerNoShowHours: env.VOLUNTEER_NO_SHOW_HOURS,
  vacuumAlertDeadRowsThreshold: env.VACUUM_ALERT_DEAD_ROWS_THRESHOLD,
  telegramBotToken: env.TELEGRAM_BOT_TOKEN ?? '',
  telegramAlertChatId: env.TELEGRAM_ALERT_CHAT_ID ?? '',
  webauthnRpId: env.WEBAUTHN_RP_ID,
  webauthnOrigin: env.WEBAUTHN_ORIGIN,
};
