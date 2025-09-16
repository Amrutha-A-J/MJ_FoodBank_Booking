import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('config', () => {
  const originalFrontend = process.env.FRONTEND_ORIGIN;
  const originalJwt = process.env.JWT_SECRET;
  const originalRefresh = process.env.JWT_REFRESH_SECRET;
  const originalPasswordTemplate = process.env.PASSWORD_SETUP_TEMPLATE_ID;
  const originalClientRescheduleTemplate = process.env.CLIENT_RESCHEDULE_TEMPLATE_ID;
  const originalVolunteerRescheduleTemplate = process.env.VOLUNTEER_RESCHEDULE_TEMPLATE_ID;
  const originalBrevoApiKey = process.env.BREVO_API_KEY;
  const originalBrevoFromEmail = process.env.BREVO_FROM_EMAIL;
  const originalIcsBaseUrl = process.env.ICS_BASE_URL;
  const originalCookieDomain = process.env.COOKIE_DOMAIN;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalFrontend === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = originalFrontend;
    }
    if (originalJwt === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwt;
    }
    if (originalRefresh === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalRefresh;
    }
    if (originalPasswordTemplate === undefined) {
      delete process.env.PASSWORD_SETUP_TEMPLATE_ID;
    } else {
      process.env.PASSWORD_SETUP_TEMPLATE_ID = originalPasswordTemplate;
    }
    if (originalClientRescheduleTemplate === undefined) {
      delete process.env.CLIENT_RESCHEDULE_TEMPLATE_ID;
    } else {
      process.env.CLIENT_RESCHEDULE_TEMPLATE_ID = originalClientRescheduleTemplate;
    }
    if (originalVolunteerRescheduleTemplate === undefined) {
      delete process.env.VOLUNTEER_RESCHEDULE_TEMPLATE_ID;
    } else {
      process.env.VOLUNTEER_RESCHEDULE_TEMPLATE_ID = originalVolunteerRescheduleTemplate;
    }
    if (originalBrevoApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalBrevoApiKey;
    }
    if (originalBrevoFromEmail === undefined) {
      delete process.env.BREVO_FROM_EMAIL;
    } else {
      process.env.BREVO_FROM_EMAIL = originalBrevoFromEmail;
    }
    if (originalIcsBaseUrl === undefined) {
      delete process.env.ICS_BASE_URL;
    } else {
      process.env.ICS_BASE_URL = originalIcsBaseUrl;
    }
    if (originalCookieDomain === undefined) {
      delete process.env.COOKIE_DOMAIN;
    } else {
      process.env.COOKIE_DOMAIN = originalCookieDomain;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    jest.resetModules();
  });

  it('parses comma-separated origins into an array', () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000,http://example.com';
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_REFRESH_SECRET = 'testrefresh';
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.frontendOrigins).toEqual([
      'http://localhost:3000',
      'http://example.com',
    ]);
  });

  it('ignores empty origin values', () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000,,http://example.com,';
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_REFRESH_SECRET = 'testrefresh';
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.frontendOrigins).toEqual([
      'http://localhost:3000',
      'http://example.com',
    ]);
  });

  it('throws if JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'testrefresh';
    jest.resetModules();
    expect(() => require('../src/config')).toThrow(/JWT_SECRET/);
  });

  it('throws if JWT_REFRESH_SECRET is missing', () => {
    process.env.JWT_SECRET = 'testsecret';
    delete process.env.JWT_REFRESH_SECRET;
    jest.resetModules();
    expect(() => require('../src/config')).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('defaults PASSWORD_SETUP_TEMPLATE_ID to 6 when missing', () => {
    delete process.env.PASSWORD_SETUP_TEMPLATE_ID;
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.passwordSetupTemplateId).toBe(6);
  });

  it('defaults CLIENT_RESCHEDULE_TEMPLATE_ID to 10 when missing', () => {
    delete process.env.CLIENT_RESCHEDULE_TEMPLATE_ID;
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.clientRescheduleTemplateId).toBe(10);
  });

  it('defaults VOLUNTEER_RESCHEDULE_TEMPLATE_ID to 10 when missing', () => {
    delete process.env.VOLUNTEER_RESCHEDULE_TEMPLATE_ID;
    jest.resetModules();
    const config = require('../src/config').default;
    expect(config.volunteerRescheduleTemplateId).toBe(10);
  });

  it('invokes dotenv.config when NODE_ENV is not test', async () => {
    process.env.NODE_ENV = 'development';
    const dotenvConfig = jest.fn();

    await jest.isolateModulesAsync(async () => {
      jest.doMock('dotenv', () => ({ config: dotenvConfig }));
      await import('../src/config');
    });

    expect(dotenvConfig).toHaveBeenCalledTimes(1);
  });

  it('defaults optional Brevo and ICS values to empty strings but uses overrides when provided', () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_FROM_EMAIL;
    delete process.env.ICS_BASE_URL;
    jest.resetModules();

    let config = require('../src/config').default;
    expect(config.brevoApiKey).toBe('');
    expect(config.brevoFromEmail).toBe('');
    expect(config.icsBaseUrl).toBe('');

    jest.resetModules();
    process.env.BREVO_API_KEY = 'live-api-key';
    process.env.BREVO_FROM_EMAIL = 'hello@example.com';
    process.env.ICS_BASE_URL = 'https://ics.example.com';

    config = require('../src/config').default;
    expect(config.brevoApiKey).toBe('live-api-key');
    expect(config.brevoFromEmail).toBe('hello@example.com');
    expect(config.icsBaseUrl).toBe('https://ics.example.com');
  });

  it('surfaces COOKIE_DOMAIN when provided', () => {
    process.env.COOKIE_DOMAIN = '.example.com';
    jest.resetModules();

    const config = require('../src/config').default;
    expect(config.cookieDomain).toBe('.example.com');
  });
});
