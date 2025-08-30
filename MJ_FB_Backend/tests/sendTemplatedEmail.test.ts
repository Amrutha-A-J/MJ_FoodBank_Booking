import { sendTemplatedEmail } from '../src/utils/emailUtils';

describe('sendTemplatedEmail', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
