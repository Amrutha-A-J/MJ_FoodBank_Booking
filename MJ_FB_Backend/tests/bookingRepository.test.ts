import mockPool, { setQueryResults } from './utils/mockDb';
import {
  checkSlotCapacity,
  insertBooking,
  updateBooking,
  SlotCapacityError,
  fetchBookings,
  fetchBookingsForReminder,
  fetchBookingHistory,
} from '../src/models/bookingRepository';


describe('bookingRepository', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  describe('checkSlotCapacity', () => {
    it('throws for invalid slot', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toBeInstanceOf(
        SlotCapacityError,
      );
    });

    it('throws when slot full', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ max_capacity: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toThrow(
        'Slot full on selected date',
      );
    });

    it('resolves when slot has capacity', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ max_capacity: 2 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });
      await expect(checkSlotCapacity(1, '2024-01-01')).resolves.toBeUndefined();
    });
  });

  it('insertBooking calls query with correct params', async () => {
    setQueryResults({});
    await insertBooking(1, 2, 'approved', '', '2024-01-01', false, 'token', null);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/INSERT INTO bookings/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        1,
        null,
        2,
        'approved',
        '',
        '2024-01-01',
        false,
        'token',
      ]),
    );
    expect(call[1]).toHaveLength(8);
  });

  it('updateBooking ignores disallowed keys', async () => {
    setQueryResults({});
    await updateBooking(1, {
      status: 'cancelled',
      request_data: 'reason',
      hacker: 'nope',
    });
    expect(mockPool.query).toHaveBeenCalled();
    const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
    expect(sql).toEqual(
      expect.stringContaining('UPDATE bookings SET status=$2, request_data=$3'),
    );
    expect(sql).toEqual(expect.stringContaining('WHERE id=$1'));
    expect(params).toEqual(expect.arrayContaining([1, 'cancelled', 'reason']));
    expect(params).toHaveLength(3);
  });

  it('updateBooking returns early when only disallowed keys provided', async () => {
    await updateBooking(1, { hacker: 'nope' });
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('fetchBookings applies optional filters', async () => {
    setQueryResults({ rows: [] });
    await fetchBookings('approved', '2024-01-01', [1, 2]);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b.status = \$1/);
    expect(call[0]).toMatch(/b.date = \$2/);
    expect(call[0]).toMatch(/u.client_id = ANY\(\$3\)/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        'approved',
        '2024-01-01',
        expect.arrayContaining([1, 2]),
      ]),
    );
    expect(call[1]).toHaveLength(3);
  });

  it('fetchBookingsForReminder selects only necessary fields', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingsForReminder('2024-01-01');
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(
      /COALESCE\(u.email, nc.email\) as user_email,\s+s.start_time,\s+s.end_time,\s+b.reschedule_token/,
    );
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b.status = 'approved'/);
    expect(call[0]).toMatch(/b.date = \$1/);
    expect(call[1]).toEqual(expect.arrayContaining(['2024-01-01']));
    expect(call[1]).toHaveLength(1);
  });

  it('fetchBookingHistory supports arrays and pagination', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1, 2], false, undefined, false, 5, 10);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b.user_id = ANY\(\$1\)/);
    expect(call[0]).toMatch(/ORDER BY b.created_at DESC/);
    expect(call[0]).toMatch(/LIMIT \$2/);
    expect(call[0]).toMatch(/OFFSET \$3/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([1, 2]),
        5,
        10,
      ]),
    );
    expect(call[1]).toHaveLength(3);
  });

  it('fetchBookingHistory uses LEFT JOIN on slots', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1], false, undefined, false);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/LEFT JOIN\s+slots\s+s\s+ON b.slot_id = s.id/);
  });
});
