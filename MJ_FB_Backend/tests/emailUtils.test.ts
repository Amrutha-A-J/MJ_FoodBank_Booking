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
