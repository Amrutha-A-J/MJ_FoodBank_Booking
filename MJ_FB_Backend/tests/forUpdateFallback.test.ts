import { checkSlotCapacity, lockClientRow } from '../src/models/bookingRepository';

describe('FOR UPDATE fallback', () => {
  it('checkSlotCapacity retries without FOR UPDATE when unsupported', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ code: '0A000' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ max_capacity: 5, approved_count: 0 }],
        })
        .mockResolvedValueOnce({}),
    };
    await expect(
      checkSlotCapacity(1, '2025-09-25', mockClient as any)
    ).resolves.toBeUndefined();
    expect(mockClient.query).toHaveBeenCalledTimes(5);
    expect(mockClient.query.mock.calls[0][0]).toEqual('SAVEPOINT check_slot_capacity');
    expect(mockClient.query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(mockClient.query.mock.calls[2][0]).toEqual(
      'ROLLBACK TO SAVEPOINT check_slot_capacity'
    );
    expect(mockClient.query.mock.calls[3][0]).not.toContain('FOR UPDATE');
    expect(mockClient.query.mock.calls[4][0]).toEqual(
      'RELEASE SAVEPOINT check_slot_capacity'
    );
  });

  it('lockClientRow retries without FOR UPDATE when unsupported', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ code: '0A000' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
    };
    await lockClientRow(1, mockClient as any);
    expect(mockClient.query.mock.calls[1]).toEqual([
      'SELECT client_id FROM clients WHERE client_id=$1 FOR UPDATE',
      [1],
    ]);
    expect(mockClient.query.mock.calls[4]).toEqual([
      'SELECT client_id FROM clients WHERE client_id=$1',
      [1],
    ]);
    expect(mockClient.query.mock.calls[5]).toEqual([
      'RELEASE SAVEPOINT lock_client_row',
    ]);
    expect(mockClient.query).toHaveBeenCalledTimes(6);
  });
});
