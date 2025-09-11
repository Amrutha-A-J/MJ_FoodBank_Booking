jest.mock('../src/utils/opsAlert');
import { alertOps } from '../src/utils/opsAlert';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { shutdownQueue } from '../src/utils/emailQueue';

describe('emailUtils alerts ops with response text', () => {
  const originalFetch = global.fetch;
  const {
    BREVO_API_KEY: originalApiKey,
    BREVO_FROM_EMAIL: originalFromEmail,
    BREVO_FROM_NAME: originalFromName,
  } = process.env;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'bad response',
    });
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_FROM_EMAIL = 'from@example.com';
    process.env.BREVO_FROM_NAME = 'Test Sender';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.BREVO_API_KEY = originalApiKey;
    process.env.BREVO_FROM_EMAIL = originalFromEmail;
    process.env.BREVO_FROM_NAME = originalFromName;
    shutdownQueue();
    jest.resetAllMocks();
  });

  it('includes response text in alertOps message on failure', async () => {
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 123 });
    expect(alertOps).toHaveBeenCalledWith(
      'sendTemplatedEmail',
      expect.objectContaining({ message: expect.stringContaining('bad response') }),
    );
  });
});
