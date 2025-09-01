import { sendTemplatedEmail } from '../src/utils/emailUtils';

describe('sendTemplatedEmail', () => {
  const originalFetch = global.fetch;
  const {
    BREVO_API_KEY: originalApiKey,
    BREVO_FROM_EMAIL: originalFromEmail,
    BREVO_FROM_NAME: originalFromName,
  } = process.env;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn() });
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_FROM_EMAIL = 'from@example.com';
    process.env.BREVO_FROM_NAME = 'Test Sender';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.BREVO_API_KEY = originalApiKey;
    process.env.BREVO_FROM_EMAIL = originalFromEmail;
    process.env.BREVO_FROM_NAME = originalFromName;
    jest.resetAllMocks();
  });

  it('sends a template email with params', async () => {
    await sendTemplatedEmail({
      to: 'user@example.com',
      templateId: 123,
      params: { name: 'Tester' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' })
    );

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({
      templateId: 123,
      params: { name: 'Tester' },
    });
  });
});
