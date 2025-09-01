import { createHash } from 'crypto';


let pool: any;

describe('passwordSetupUtils', () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    pool = (await import('../src/db')).default;
    delete process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS;
  });

  it('generates a token and stores its hash with configured expiry', async () => {
    process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS = '1';
    const { generatePasswordSetupToken } = await import(
      '../src/utils/passwordSetupUtils'
    );
    process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS = '2';
    (pool.query as jest.Mock).mockResolvedValue({});
    const before = Date.now();
    const token = await generatePasswordSetupToken('staff', 1);
    expect(typeof token).toBe('string');
    const expectedHash = createHash('sha256').update(token).digest('hex');
    const queryArgs = (pool.query as jest.Mock).mock.calls[0];
    expect(queryArgs[0]).toContain('INSERT INTO password_setup_tokens');
    expect(queryArgs[1][2]).toBe(expectedHash);
    const expiresAt = queryArgs[1][3] as Date;
    const diff = expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000 - 1000);
    expect(diff).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000);
  });

  it('verifies a stored token', async () => {
    const { verifyPasswordSetupToken } = await import(
      '../src/utils/passwordSetupUtils'
    );
    const token = 'abc123';
    const hash = createHash('sha256').update(token).digest('hex');
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 2,
          user_type: 'staff',
          user_id: 5,
          token_hash: hash,
          expires_at: new Date(Date.now() + 1000).toISOString(),
          used: false,
        },
      ],
    });
    const row = await verifyPasswordSetupToken(token);
    expect(row).toMatchObject({ id: 2, user_type: 'staff', user_id: 5 });
  });
});
