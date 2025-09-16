import { fetchNewClients, insertNewClient } from '../../src/models/newClient';

describe('insertNewClient', () => {
  it('inserts a new client when an email is provided', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 123 }] }),
    } as any;

    const id = await insertNewClient('Test User', 'test@example.com', '306-555-1234', client);

    expect(id).toBe(123);
    expect(client.query).toHaveBeenCalledWith(
      `INSERT INTO new_clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['Test User', 'test@example.com', '306-555-1234'],
    );
  });

  it('inserts a new client when no email is provided', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 456 }] }),
    } as any;

    const id = await insertNewClient('No Email User', null, '306-555-9876', client);

    expect(id).toBe(456);
    expect(client.query).toHaveBeenCalledWith(
      `INSERT INTO new_clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['No Email User', null, '306-555-9876'],
    );
  });

  it('returns the existing id when an email already exists', async () => {
    const client = {
      query: jest
        .fn()
        .mockRejectedValueOnce({ code: '23505' })
        .mockResolvedValueOnce({ rows: [{ id: 789 }], rowCount: 1 }),
    } as any;

    const id = await insertNewClient('Duplicate User', 'dup@example.com', '306-555-0000', client);

    expect(id).toBe(789);
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      `SELECT id FROM new_clients WHERE LOWER(email) = LOWER($1)`,
      ['dup@example.com'],
    );
  });
});

describe('fetchNewClients', () => {
  it('retrieves new clients ordered by creation date', async () => {
    const rows = [
      { id: 2, name: 'Most Recent', email: 'recent@example.com', phone: '555-0002', created_at: '2024-06-02' },
      { id: 1, name: 'Older', email: 'older@example.com', phone: '555-0001', created_at: '2024-06-01' },
    ];

    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows }),
    } as any;

    const result = await fetchNewClients(client);

    expect(result).toEqual(rows);
    expect(client.query).toHaveBeenCalledWith(
      `SELECT id, name, email, phone, created_at FROM new_clients ORDER BY created_at DESC`,
    );
  });
});
