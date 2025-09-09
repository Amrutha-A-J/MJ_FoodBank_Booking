import { describe, it, afterEach, expect, jest } from '@jest/globals';

// ensure env vars present from .env.test plus telegram ones for specific tests

describe('alertOps telegram', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChat = process.env.TELEGRAM_ALERT_CHAT_ID;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
    if (originalChat === undefined) {
      delete process.env.TELEGRAM_ALERT_CHAT_ID;
    } else {
      process.env.TELEGRAM_ALERT_CHAT_ID = originalChat;
    }
    jest.resetModules();
  });

  it('sends message when telegram env vars set', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_ALERT_CHAT_ID = '123';
    jest.resetModules();
    const { alertOps } = await import('../src/utils/opsAlert');
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: true } as any);
    await alertOps('job', new Error('oops'));
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('[MJFB] job failed');
    expect(body.text).toContain('Time:');
    expect(body.text).toContain('Error: oops');
    fetchMock.mockRestore();
  });

  it('skips telegram when vars missing', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ALERT_CHAT_ID;
    jest.resetModules();
    const { alertOps } = await import('../src/utils/opsAlert');
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true } as any);
    await alertOps('job', new Error('oops'));
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
