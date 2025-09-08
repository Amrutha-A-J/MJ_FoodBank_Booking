import { insertNewClient } from '../src/models/newClient';

describe('insertNewClient', () => {
  it('inserts and returns new id', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }),
    } as any;

    const id = await insertNewClient('Test', 'test@example.com', '123', client);

    expect(id).toBe(1);
    expect(client.query).toHaveBeenCalledWith(
      `INSERT INTO new_clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['Test', 'test@example.com', '123'],
    );
  });

  it('returns existing id when email already exists', async () => {
    const client = {
      query: jest
        .fn()
        .mockRejectedValueOnce({ code: '23505' })
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }),
    } as any;

    const id = await insertNewClient('Dup', 'dup@example.com', '123', client);

    expect(id).toBe(2);
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      `SELECT id FROM new_clients WHERE LOWER(email) = LOWER($1)`,
      ['dup@example.com'],
    );
  });
});

