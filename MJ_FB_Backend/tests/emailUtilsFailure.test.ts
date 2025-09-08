jest.mock('../src/utils/opsAlert');
import { alertOps } from '../src/utils/opsAlert';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';
import { shutdownQueue } from '../src/utils/emailQueue';
import config from '../src/config';

describe('emailUtils error logging', () => {
  const originalFetch = global.fetch;
  let errorSpy: jest.SpyInstance;
  const {
    BREVO_API_KEY: originalApiKey,
    BREVO_FROM_EMAIL: originalFromEmail,
    BREVO_FROM_NAME: originalFromName,
  } = process.env;
  const { brevoApiKey: originalBrevoApiKey, brevoFromEmail: originalBrevoFromEmail } = config;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    });
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_FROM_EMAIL = 'from@example.com';
    process.env.BREVO_FROM_NAME = 'Test Sender';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    errorSpy.mockRestore();
    process.env.BREVO_API_KEY = originalApiKey;
    process.env.BREVO_FROM_EMAIL = originalFromEmail;
    process.env.BREVO_FROM_NAME = originalFromName;
    config.brevoApiKey = originalBrevoApiKey;
    config.brevoFromEmail = originalBrevoFromEmail;
    shutdownQueue();
    jest.resetAllMocks();
  });

  it('logs error and alerts ops when sendTemplatedEmail receives non-2xx response', async () => {
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 123 });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to send template email via Brevo',
      expect.objectContaining({
        status: 500,
        to: 'user@example.com',
        templateId: 123,
      })
    );
    expect(alertOps).toHaveBeenCalledWith('sendTemplatedEmail', expect.any(Error));
  });

  it('alerts ops when Brevo configuration is missing', async () => {
    config.brevoApiKey = '';
    config.brevoFromEmail = '';
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 123 });
    expect(alertOps).toHaveBeenCalledWith('sendTemplatedEmail', expect.any(Error));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
