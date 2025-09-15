jest.mock('../src/utils/opsAlert');
import { alertOps } from '../src/utils/opsAlert';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';
import { shutdownQueue } from '../src/utils/emailQueue';

describe('sendTemplatedEmail email validation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    shutdownQueue();
    jest.resetAllMocks();
  });

  it('logs a warning and skips sending for invalid email', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await sendTemplatedEmail({ to: 'not-an-email', templateId: 1 });

    expect(warnSpy).toHaveBeenCalledWith(
      'Invalid recipient email provided. Template email not sent.',
      expect.objectContaining({ to: 'not-an-email', templateId: 1 })
    );
    expect(global.fetch).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('sendTemplatedEmail Brevo failure', () => {
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
      text: async () => 'error body',
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

  it('alerts ops with response text on non-200 response', async () => {
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 123 });

    expect(alertOps).toHaveBeenCalledWith(
      'sendTemplatedEmail',
      expect.objectContaining({
        message: 'Brevo responded with status 500: error body',
      })
    );
  });
});

describe('sendTemplatedEmail attachments', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    shutdownQueue();
    jest.resetAllMocks();
  });

  it('sends email without attachments', async () => {
    await sendTemplatedEmail({ to: 'user@example.com', templateId: 1 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.attachment).toBeUndefined();
  });

  it('sends email with attachments', async () => {
    const attachments = [
      { name: 'test.txt', content: 'hello', type: 'text/plain' },
    ];

    await sendTemplatedEmail({ to: 'user@example.com', templateId: 1, attachments });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.attachment).toEqual(attachments);
  });
});

describe('sendTemplatedEmail error handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    shutdownQueue();
    jest.resetAllMocks();
  });

  it('alerts ops when template rendering fails', async () => {
    global.fetch = jest.fn();
    const stringifyMock = jest
      .spyOn(JSON, 'stringify')
      .mockImplementation(() => {
        throw new Error('render fail');
      });
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      sendTemplatedEmail({ to: 'user@example.com', templateId: 1 })
    ).rejects.toThrow('render fail');

    expect(alertOps).toHaveBeenCalledWith('sendTemplatedEmail', expect.any(Error));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    stringifyMock.mockRestore();
    warnSpy.mockRestore();
  });

  it('alerts ops when transport send rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      sendTemplatedEmail({ to: 'user@example.com', templateId: 1 })
    ).rejects.toThrow('network error');

    expect(alertOps).toHaveBeenCalledWith('sendTemplatedEmail', expect.any(Error));
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
