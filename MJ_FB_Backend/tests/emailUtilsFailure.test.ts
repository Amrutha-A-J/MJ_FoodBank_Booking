import { sendEmail, sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';

describe('emailUtils error logging', () => {
  const originalFetch = global.fetch;
  let errorSpy: jest.SpyInstance;
  const {
    BREVO_API_KEY: originalApiKey,
    BREVO_FROM_EMAIL: originalFromEmail,
    BREVO_FROM_NAME: originalFromName,
  } = process.env;

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
    jest.resetAllMocks();
  });

  it('logs error when sendEmail receives non-2xx response', async () => {
    await sendEmail('user@example.com', 'Subject', '<p>Hello</p>');
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to send email via Brevo',
      expect.objectContaining({
        status: 500,
        to: 'user@example.com',
        subject: 'Subject',
      })
    );
  });

  it('logs error when sendTemplatedEmail receives non-2xx response', async () => {
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 123 });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to send template email via Brevo',
      expect.objectContaining({
        status: 500,
        to: 'user@example.com',
        templateId: 123,
      })
    );
  });
});
