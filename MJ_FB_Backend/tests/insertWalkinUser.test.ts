import mockPool from './utils/mockDb';
import { insertWalkinUser } from '../src/models/bookingRepository';


describe('insertWalkinUser', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it('issues INSERT with clients.client_id and profile link', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ client_id: 123 }] });

    const first = 'Test';
    const last = 'User';
    const email = 'test@example.com';
    const clientId = 123;

    const result = await insertWalkinUser(first, last, email, clientId, mockPool);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    const [query, params] = (mockPool.query as jest.Mock).mock.calls[0];

    expect(query).toContain('INSERT INTO clients');
    expect(query).toMatch(/client_id/);
    expect(query).toMatch(/RETURNING client_id/);

    expect(params[0]).toBe(first);
    expect(params[1]).toBe(last);
    expect(params[2]).toBe(email);
    expect(params[3]).toBe(clientId);
    expect(params[4]).toBe(`https://portal.link2feed.ca/org/1605/intake/${clientId}`);

    expect(result).toBe(123);
  });
});

