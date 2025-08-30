import { createHash } from 'crypto';
import pool from '../src/db';
import {
  generatePasswordSetupToken,
  verifyPasswordSetupToken,
} from '../src/utils/passwordSetupUtils';

jest.mock('../src/db');

describe('passwordSetupUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a token and stores its hash', async () => {
    (pool.query as jest.Mock).mockResolvedValue({});
    const token = await generatePasswordSetupToken('staff', 1);
    expect(typeof token).toBe('string');
    const expectedHash = createHash('sha256').update(token).digest('hex');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain(
      'INSERT INTO password_setup_tokens',
    );
    expect((pool.query as jest.Mock).mock.calls[0][1][2]).toBe(expectedHash);
  });

  it('verifies a stored token', async () => {
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
