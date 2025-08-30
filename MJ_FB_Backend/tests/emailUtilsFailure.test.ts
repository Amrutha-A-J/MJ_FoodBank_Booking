import { sendEmail, sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';

describe('emailUtils error logging', () => {
  const originalFetch = global.fetch;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    });
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    errorSpy.mockRestore();
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
