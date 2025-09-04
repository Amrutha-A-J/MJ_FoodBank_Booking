// Setup environment variables for tests. Add additional variables here as
// future tests require them.
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
process.env.PG_USER = 'testuser';
process.env.PG_PASSWORD = 'testpassword';
process.env.PG_HOST = 'localhost';
process.env.PG_PORT = '5432';
process.env.PG_DATABASE = 'testdb';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.BREVO_API_KEY = 'test-api-key';
process.env.BREVO_FROM_EMAIL = 'noreply@example.com';
process.env.BREVO_FROM_NAME = 'MJ Food Bank';
process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS = '24';
process.env.PASSWORD_SETUP_TEMPLATE_ID = '1478167';

const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PG_USER',
  'PG_PASSWORD',
  'PG_HOST',
  'PG_PORT',
  'PG_DATABASE',
  'FRONTEND_ORIGIN',
  'BREVO_API_KEY',
  'BREVO_FROM_EMAIL',
  'BREVO_FROM_NAME',
  'PASSWORD_SETUP_TOKEN_TTL_HOURS',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
}

export {};
