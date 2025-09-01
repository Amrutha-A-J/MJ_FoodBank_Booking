import pool from '../src/db';
import { insertWalkinUser } from '../src/models/bookingRepository';

jest.mock('../src/db');

describe('insertWalkinUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues INSERT with client_id and profile link', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ client_id: 123 }] });

    const first = 'Test';
    const last = 'User';
    const email = 'test@example.com';
    const id = 123;

    const result = await insertWalkinUser(first, last, email, id, pool);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const call = (pool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/INSERT INTO clients \(first_name, last_name, email, phone, client_id, role, profile_link\)/);
    expect(call[0]).toMatch(/RETURNING client_id/);
    expect(call[1]).toEqual([
      first,
      last,
      email,
      id,
      `https://portal.link2feed.ca/org/1605/intake/${id}`,
    ]);
    expect(result).toBe(123);
  });
});

