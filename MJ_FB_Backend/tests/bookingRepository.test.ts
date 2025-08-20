import pool from '../src/db';
import {
  checkSlotCapacity,
  insertBooking,
  updateBooking,
  SlotCapacityError,
} from '../src/models/bookingRepository';

jest.mock('../src/db');

describe('bookingRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSlotCapacity', () => {
    it('throws for invalid slot', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toBeInstanceOf(
        SlotCapacityError,
      );
    });

    it('throws when slot full', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ max_capacity: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toThrow(
        'Slot full on selected date',
      );
    });

    it('resolves when slot has capacity', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ max_capacity: 2 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });
      await expect(checkSlotCapacity(1, '2024-01-01')).resolves.toBeUndefined();
    });
  });

  it('insertBooking calls query with correct params', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    await insertBooking(1, 2, 'submitted', '', '2024-01-01', false, 'token');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/INSERT INTO bookings/);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([
      1,
      2,
      'submitted',
      '',
      '2024-01-01',
      false,
      'token',
    ]);
  });

  it('updateBooking builds dynamic query', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    await updateBooking(1, { status: 'cancelled', request_data: 'reason' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE bookings SET status=$2, request_data=$3 WHERE id=$1',
      [1, 'cancelled', 'reason'],
    );
  });
});
