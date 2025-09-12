import { checkSlotCapacity, lockClientRow } from '../src/models/bookingRepository';

describe('FOR UPDATE fallback', () => {
  it('checkSlotCapacity retries without FOR UPDATE when unsupported', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockRejectedValueOnce({ code: '0A000' })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ max_capacity: 5, approved_count: 0 }] }),
    };
    await expect(
      checkSlotCapacity(1, '2025-09-25', mockClient as any)
    ).resolves.toBeUndefined();
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });

  it('lockClientRow retries without FOR UPDATE when unsupported', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockRejectedValueOnce({ code: '0A000' })
        .mockResolvedValueOnce({}),
    };
    await lockClientRow(1, mockClient as any);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      1,
      'SELECT client_id FROM clients WHERE client_id=$1 FOR UPDATE',
      [1]
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      'SELECT client_id FROM clients WHERE client_id=$1',
      [1]
    );
  });
});
