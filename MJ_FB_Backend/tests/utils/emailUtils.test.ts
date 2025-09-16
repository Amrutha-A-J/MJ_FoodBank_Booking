import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { sendTemplatedEmail } from '../../src/utils/emailUtils';
import logger from '../../src/utils/logger';
import { alertOps } from '../../src/utils/opsAlert';

const originalFetch = global.fetch;

describe('utils/sendTemplatedEmail', () => {
  beforeEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('omits params when not provided', async () => {
    const brevoMock = jest.fn().mockResolvedValue({ ok: true, text: jest.fn() });
    global.fetch = brevoMock as unknown as typeof global.fetch;

    await expect(
      sendTemplatedEmail({ to: 'user@example.com', templateId: 42 })
    ).resolves.toBeUndefined();

    expect(brevoMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = brevoMock.mock.calls[0] as [unknown, RequestInit];
    const body = JSON.parse((requestInit.body as string) ?? '');
    expect(body.templateId).toBe(42);
    expect(body.to).toEqual([{ email: 'user@example.com' }]);
    expect('params' in body).toBe(false);
  });

  it('propagates Brevo failures so retries can occur', async () => {
    const error = new Error('brevo down');
    const brevoMock = jest.fn().mockRejectedValue(error);
    global.fetch = brevoMock as unknown as typeof global.fetch;

    await expect(
      sendTemplatedEmail({ to: 'user@example.com', templateId: 101 })
    ).rejects.toThrow('brevo down');

    expect(brevoMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Template email not sent. Check Brevo configuration or running in local environment.',
      expect.objectContaining({
        to: 'user@example.com',
        templateId: 101,
        error,
      })
    );
    expect(alertOps).toHaveBeenCalledWith('sendTemplatedEmail', error);
  });

  it('logs details when Brevo responds with a failure status', async () => {
    const brevoMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('service unavailable'),
    });
    global.fetch = brevoMock as unknown as typeof global.fetch;

    await sendTemplatedEmail({ to: 'user@example.com', templateId: 7 });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send template email via Brevo',
      expect.objectContaining({
        status: 503,
        responseText: 'service unavailable',
        to: 'user@example.com',
        templateId: 7,
      })
    );
    expect(alertOps).toHaveBeenCalledWith(
      'sendTemplatedEmail',
      expect.objectContaining({
        message: 'Brevo responded with status 503: service unavailable',
      })
    );
  });
});
